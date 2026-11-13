"use client";

import { useEffect, useRef } from "react";

type Figure = {
  name: string;
  range: number[];
  tour: ([number, number] | null)[];
  mount: (ctx: { stage: HTMLElement; svg: SVGElement; read: { textContent: string } }, value: number) => { destroy: () => void };
};

type Kernel = {
  inject: (doc: Document) => void;
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => SVGElement;
  tour: (stage: HTMLElement, stops: Figure["tour"]) => { stop: () => void };
};

let loaded: Promise<{ HL: Kernel; figure: Figure }> | null = null;

// the built figure page holds the kernel and the figure as two scripts: run them here, once per page
function load() {
  loaded ??= (async () => {
    const res = await fetch("/hairline/hairline-handover.html");
    if (!res.ok) throw new Error("hairline figure failed to load");
    const page = new DOMParser().parseFromString(await res.text(), "text/html");
    const kernel = page.getElementById("hl-kernel")?.textContent;
    const code = page.getElementById("hl-figure")?.textContent;
    if (!kernel || !code) throw new Error("hairline figure page is missing its scripts");
    const HL: Kernel = new Function(`${kernel}\nreturn HL;`)();
    let figure: Figure | undefined;
    new Function("HL", "hairline", code)(HL, (f: Figure) => (figure = f));
    if (!figure) throw new Error("hairline figure did not register");
    return { HL, figure };
  })().catch((error) => {
    loaded = null;
    throw error;
  });
  return loaded;
}

export function HairlineStall({ label }: { label: string }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let dead = false;
    let stop = () => {};

    load()
      .then(({ HL, figure }) => {
        if (dead) return;
        HL.inject(document);
        stage.setAttribute("data-hairline", figure.name);
        const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
        const handle = figure.mount({ stage, svg, read: { textContent: "" } }, figure.range[1]);
        const tour = HL.tour(stage, figure.tour);
        stop = () => {
          tour.stop();
          handle.destroy();
          stage.replaceChildren();
        };
      })
      .catch((error) => console.error(error));

    return () => {
      dead = true;
      stop();
    };
  }, []);

  return <div ref={stageRef} role="img" aria-label={label} />;
}
