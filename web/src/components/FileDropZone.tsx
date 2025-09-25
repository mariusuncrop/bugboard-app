import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';

interface Props {
  /** id for the <label htmlFor> that names this control. */
  inputId: string;
  inputTestId: string;
  dropZoneTestId: string;
  multiple?: boolean;
  hint?: ReactNode;
  onFiles: (files: File[]) => void;
}

/**
 * A drop target wrapped around a real file input. The input stays visible and
 * focusable rather than hidden behind the drop zone — dragging is a pointer
 * gesture, so it can never be the only way to attach something.
 */
export function FileDropZone({ inputId, inputTestId, dropZoneTestId, multiple, hint, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  // dragenter and dragleave fire for descendants too, so a boolean flickers as
  // the pointer crosses the label or the hint. Counting entries does not.
  const depth = useRef(0);
  const [active, setActive] = useState(false);

  const carriesFiles = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer.types).includes('Files');

  const handleEnter = (event: DragEvent) => {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    setActive(true);
  };

  const handleOver = (event: DragEvent) => {
    if (!carriesFiles(event)) return;
    // Without this the browser navigates to the dropped file instead.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setActive(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    depth.current = 0;
    setActive(false);

    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length > 0) onFiles(multiple ? dropped : dropped.slice(0, 1));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    // Clear it so picking the same file twice still fires a change event.
    if (input.current) input.current.value = '';
    if (chosen.length > 0) onFiles(chosen);
  };

  return (
    <div
      className={`dropzone${active ? ' dropzone--active' : ''}`}
      data-testid={dropZoneTestId}
      data-active={active}
      onDragEnter={handleEnter}
      onDragOver={handleOver}
      onDragLeave={handleLeave}
      onDrop={handleDrop}
    >
      <p className="dropzone__prompt">
        <span aria-hidden="true">⇪</span> Drag files here, or choose them:
      </p>
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple={multiple}
        data-testid={inputTestId}
        onChange={handleChange}
      />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
