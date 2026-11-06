"use client";

import { useEffect, useRef, useState } from "react";
import { GlassSurface } from "./GlassSurface";

// One decorative optical surface follows real links. It never intercepts input.
export function SidebarGlassHover({ mode }) {
  const host = useRef(null), [visible, setVisible] = useState(false);
  useEffect(() => {
    const lens = host.current, sidebar = lens.parentElement;
    let target = null;
    const hide = () => { target = null;setVisible(false); };
    const position = () => {
      if (!target?.isConnected || !target.offsetHeight || sidebar.hidden) { hide();return; }
      const box = target.getBoundingClientRect(), parent = sidebar.getBoundingClientRect();
      lens.style.transform = `translate3d(${box.left - parent.left - sidebar.clientLeft}px,${box.top - parent.top - sidebar.clientTop}px,0)`;
      lens.style.width = box.width + "px";lens.style.height = box.height + "px";
      setVisible(true);
    };
    const enter = event => {
      if (event.type === "pointerover" && (event.pointerType === "touch" || !matchMedia("(hover:hover)").matches)) return;
      const link = event.target.closest?.(".ui-sidebar-link");
      if (!link || !sidebar.contains(link)) { hide();return; }
      target = link;position();
    };
    const focusOut = event => { if (!sidebar.contains(event.relatedTarget)) hide(); };
    sidebar.addEventListener("pointerover", enter);sidebar.addEventListener("pointerleave", hide);
    sidebar.addEventListener("focusin", enter);sidebar.addEventListener("focusout", focusOut);
    sidebar.addEventListener("scroll", hide, true);window.addEventListener("resize", hide);
    return () => { sidebar.removeEventListener("pointerover", enter);sidebar.removeEventListener("pointerleave", hide);sidebar.removeEventListener("focusin", enter);sidebar.removeEventListener("focusout", focusOut);sidebar.removeEventListener("scroll", hide, true);window.removeEventListener("resize", hide); };
  }, []);
  return <span ref={host} className="ui-sidebar-hover" aria-hidden="true" data-visible={visible}>
    <GlassSurface as="span" mode={visible ? mode : "css"} radius={10} name="sidebar-hover" interactive={false} />
  </span>;
}
