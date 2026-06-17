"""
Playground Series S6E6 - Stellar Classification (GALAXY / QSO / STAR)
Metric: accuracy. Strategy: LightGBM multiclass, StratifiedKFold, SDSS color features.
"""
import os, sys, time, json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score
import lightgbm as lgb

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "submissions")
os.makedirs(OUT, exist_ok=True)

N_FOLDS = int(os.environ.get("N_FOLDS", 5))
SEED = 42
CAT_COLS = ["spectral_type", "galaxy_population"]


def add_features(df):
    df = df.copy()
    # SDSS photometric color indices — the canonical discriminative features
    bands = ["u", "g", "r", "i", "z"]
    for a, b in [("u", "g"), ("g", "r"), ("r", "i"), ("i", "z"),
                 ("u", "r"), ("u", "z"), ("g", "i"), ("g", "z"), ("r", "z")]:
        df[f"{a}_{b}"] = df[a] - df[b]
    # redshift interactions (redshift is the dominant separator of QSO/GALAXY/STAR)
    df["redshift_abs"] = df["redshift"].abs()
    df["redshift_log1p"] = np.sign(df["redshift"]) * np.log1p(df["redshift"].abs())
    df["r_over_z_red"] = df["r"] * df["redshift"]
    df["mag_mean"] = df[bands].mean(axis=1)
    df["mag_std"] = df[bands].std(axis=1)
    df["mag_range"] = df[bands].max(axis=1) - df[bands].min(axis=1)
    return df


def main():
    t0 = time.time()
    train = pd.read_csv(os.path.join(DATA, "train.csv"))
    test = pd.read_csv(os.path.join(DATA, "test.csv"))

    classes = sorted(train["class"].unique())
    cls2idx = {c: i for i, c in enumerate(classes)}
    idx2cls = {i: c for c, i in cls2idx.items()}
    y = train["class"].map(cls2idx).values

    train = add_features(train)
    test = add_features(test)
    for c in CAT_COLS:
        train[c] = train[c].astype("category")
        test[c] = pd.Categorical(test[c], categories=train[c].cat.categories)

    features = [c for c in train.columns if c not in ("id", "class")]
    print(f"[info] {len(features)} features, {N_FOLDS} folds, classes={classes}")

    params = dict(
        objective="multiclass", num_class=len(classes), metric="multi_logloss",
        learning_rate=0.03, num_leaves=255, max_depth=-1,
        feature_fraction=0.7, bagging_fraction=0.8, bagging_freq=1,
        min_child_samples=50, lambda_l1=1.0, lambda_l2=1.0,
        n_jobs=-1, seed=SEED, verbose=-1,
    )

    oof = np.zeros((len(train), len(classes)))
    pred = np.zeros((len(test), len(classes)))
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)

    for fold, (tr_idx, va_idx) in enumerate(skf.split(train[features], y)):
        dtr = lgb.Dataset(train[features].iloc[tr_idx], y[tr_idx], categorical_feature=CAT_COLS)
        dva = lgb.Dataset(train[features].iloc[va_idx], y[va_idx], categorical_feature=CAT_COLS)
        model = lgb.train(
            params, dtr, num_boost_round=4000, valid_sets=[dva],
            callbacks=[lgb.early_stopping(150), lgb.log_evaluation(0)],
        )
        oof[va_idx] = model.predict(train[features].iloc[va_idx])
        pred += model.predict(test[features]) / N_FOLDS
        acc = accuracy_score(y[va_idx], oof[va_idx].argmax(1))
        print(f"[fold {fold}] best_iter={model.best_iteration} acc={acc:.5f}")

    cv_acc = accuracy_score(y, oof.argmax(1))
    print(f"[CV] overall accuracy = {cv_acc:.5f}  ({time.time()-t0:.0f}s)")

    sub = pd.DataFrame({"id": test["id"], "class": [idx2cls[i] for i in pred.argmax(1)]})
    stamp = time.strftime("%Y%m%d_%H%M%S")
    path = os.path.join(OUT, f"sub_lgbm_{cv_acc:.5f}_{stamp}.csv")
    sub.to_csv(path, index=False)
    # stable pointer for the automation script
    sub.to_csv(os.path.join(OUT, "latest.csv"), index=False)
    with open(os.path.join(OUT, "latest.json"), "w") as f:
        json.dump({"cv_acc": cv_acc, "path": path, "stamp": stamp,
                   "message": f"LGBM {N_FOLDS}fold cv_acc={cv_acc:.5f}"}, f, indent=2)
    print(f"[saved] {path}")


if __name__ == "__main__":
    main()
