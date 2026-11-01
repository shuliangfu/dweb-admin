/**
 * 示例 Button 组件：用于首页计数器等
 */

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  children?: unknown;
}

export function Button({
  variant = "primary",
  onClick,
  children,
}: ButtonProps) {
  const base = "rounded-lg px-4 py-2";
  const styles = {
    primary: "border-0 bg-indigo-500 text-white hover:opacity-90",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200",
  };
  return (
    <button
      type="button"
      class={`${base} ${styles[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
