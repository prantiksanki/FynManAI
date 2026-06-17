# steller — Kaggle Playground Series S6E6 (Stellar Classification)

**Competition:** `playground-series-s6e6` · deadline 2026-06-30 · already entered (user: suhanxd)
**Task:** multiclass classification of `class` ∈ {GALAXY, QSO, STAR} from SDSS photometry.
**Metric:** accuracy. Submission = `id,class` (string labels). See `data/sample_submission.csv`.

## Data (`data/`, not committed)
- `train.csv` 577,347 rows · `test.csv` 247,435 rows · no missing values.
- Features: `alpha, delta` (sky coords), `u g r i z` (photometric mags), `redshift`,
  `spectral_type` (M, A/F, G/K, O/B), `galaxy_population` (Red_Sequence, Blue_Cloud).
- Class balance: GALAXY 65% · QSO 20% · STAR 14%.
- `redshift` is the dominant separator (STAR≈0.07, GALAXY≈0.5, QSO≈1.9 mean).

## Pipeline (`train.py`)
- SDSS color indices (u-g, g-r, …), redshift transforms, magnitude aggregates → 25 features.
- LightGBM multiclass, StratifiedKFold (N_FOLDS env, default 5), native categorical handling.
- Writes `submissions/sub_lgbm_<cv>_<stamp>.csv`, `submissions/latest.csv`, `latest.json`.
- 2-fold smoke CV = 0.96715 (LB top ≈ 0.97282).

## Automation (`automate.sh`)
`./automate.sh {pull|train|submit|score|git|all}` — `KAGGLE_CONFIG_DIR` is set to this folder
so the local `kaggle.json` is used. `all` = pull → train → submit → score.

## Ideas to push score
- XGBoost/CatBoost + ensemble (blend OOF-weighted).
- Hyperparameter tuning (Optuna) on num_leaves / learning_rate / regularization.
- Target the QSO/GALAXY boundary (most confusion); redshift-band features.
