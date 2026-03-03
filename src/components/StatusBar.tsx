interface StatusBarProps {
  message: string;
}

export function StatusBar({ message }: StatusBarProps) {
  return <p className="status-line">{message}</p>;
}
