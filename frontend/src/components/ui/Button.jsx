export default function Button({ variant = "primary", size, className = "", ...props }) {
  const sizeClass = size === "sm" ? "px-3.5 py-[7px] text-[13px]" : "";
  const classes = ["btn", `btn-${variant}`, sizeClass, className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}
