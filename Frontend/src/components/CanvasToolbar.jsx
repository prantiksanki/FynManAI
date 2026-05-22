export function CanvasToolbar({ onClear, onStop, isPlaying }) {
  return (
    <div className="canvas-toolbar">
      {isPlaying && (
        <button className="toolbar-btn toolbar-btn--stop" onClick={onStop} title="Stop playback">
          ■ Stop
        </button>
      )}
      <button className="toolbar-btn toolbar-btn--clear" onClick={onClear} title="Clear canvas">
        ⌫ Clear
      </button>
    </div>
  );
}
