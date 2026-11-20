export function MobileDetailCell({ label, primary, actions, children, ...props }) {
  // Safari can drop native table semantics when responsive cells change display.
  // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role
  return <td role="cell" data-mobile-lead={primary ? "" : undefined} data-mobile-actions={actions ? "" : undefined} {...props}>
    {label && <span className="mobile-table-label" aria-hidden="true">{label}</span>}
    <div className="mobile-table-value">{children}</div>
  </td>;
}
