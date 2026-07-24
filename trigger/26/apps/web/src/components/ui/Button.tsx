"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  disabled,
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}
