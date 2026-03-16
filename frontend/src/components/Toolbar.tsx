interface ToolbarProps {
  onKeyPress: (key: string) => void;
}

export function Toolbar({ onKeyPress }: ToolbarProps) {
  const buttons = [
    { key: 'ctrl', label: 'Ctrl' },
    { key: 'esc', label: 'Esc' },
    { key: 'tab', label: 'Tab' },
    { key: 'left', label: '←' },
    { key: 'up', label: '↑' },
    { key: 'down', label: '↓' },
    { key: 'right', label: '→' },
  ];

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-2 py-2">
      <div className="flex gap-1 justify-center flex-wrap">
        {buttons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors active:bg-gray-500"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
