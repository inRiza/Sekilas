/**
 * Handover: a shop stall seen from above. A long counter with an overhanging
 * top, a till at the back, a striped awning on two posts, and a paper bag on
 * the shopkeeper's tray. Where the pointer is across the counter sets how far
 * the bag has travelled: it rises, crosses and settles on the customer's tray.
 * The slider is how high the bag hops.
 *
 * The pattern: scrub. One spring on the travel, driven by the pointer's screen
 * x, which no pose ever moves.
 */
const {
  Cam, clamp, facing, fillet, fit, lerp, open, poly, prism, proj, rings, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

const CX0 = 36, CX1 = 116, CY0 = 0, CY1 = 104, CH = 28, TOP = 3;
const BX0 = 52, BX1 = 100, BY = 62, BH = 32, HOPMAX = 22;
const POST = 104, FLAPS = 6, FY0 = -16, FY1 = 120, FX = 44;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let hop = value, drawn = NaN;

  const C = Cam(45, 0.5, 1.46);
  fit(C, [[-8, -24, -4], [150, 128, -4], [150, -24, -4], [-8, 128, -4], [16, FY0, POST + 5], [BX1, BY, CH + BH + HOPMAX + 10]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  /** A rounded solid from z0 to z1, appended now: callers append back to front. */
  const block = (x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b), s = solid(g);
    put(s, prism(P, front, ring, inner, z0, z1));
    return s;
  };

  // street, far post, counter in two pieces (body, overhanging top), till, trays
  block(-8, -24, 150, 128, 10, 2.4, -4, 0);
  block(22, -12, 28, -6, 2, 0.8, 0, POST);
  block(CX0 + 3, CY0 + 3, CX1 - 3, CY1 - 3, 3, 1.2, 0, CH - TOP);
  block(CX0, CY0, CX1, CY1, 4, 1.4, CH - TOP, CH);
  block(CX0 + 8, 8, CX0 + 32, 32, 3, 1, CH, CH + 8);
  block(CX0 + 12, 12, CX0 + 28, 24, 2.6, 0.8, CH + 8, CH + 16);
  block(BX0 - 12, BY - 18, BX0 + 12, BY + 18, 3, 0.9, CH, CH + 1.2);
  block(BX1 - 12, BY - 18, BX1 + 12, BY + 18, 3, 0.9, CH, CH + 1.2);
  block(22, 110, 28, 116, 2, 0.8, 0, POST);

  // the bag: a body, and one handle that arcs over its top
  const bg = mk("g", {}, g), body = solid(bg), handle = mk("path", { class: "nf hi" }, bg);
  body.sil.classList.add("hi");

  // the awning: a slab on the posts and six scalloped flaps hanging from its front edge
  block(16, FY0, FX, FY1, 4, 1.4, POST, POST + 4);
  const fw = (FY1 - FY0) / FLAPS;
  for (let i = 0; i < FLAPS; i++) {
    const u0 = FY0 + i * fw + 0.7, u1 = FY0 + (i + 1) * fw - 0.7;
    const shape = fillet([[u0, POST], [u1, POST], [u1, POST - 18], [u0, POST - 18]], [1, 1, 9, 9]);
    mk("path", { d: poly(shape.map(([u, z]) => P(FX + 0.5, u, z))), class: i % 2 ? "lo" : "sil" }, g);
  }

  function drawBag(t) {
    const x = lerp(BX0, BX1, t), z0 = CH + 1.2 + 4 * hop * t * (1 - t), z1 = z0 + BH;
    const [ring, inner] = rings(x - 9, BY - 12, x + 9, BY + 12, 3, 1.2);
    put(body, prism(P, front, ring, inner, z0, z1));
    const arc = [];
    for (let k = 0; k <= 8; k++) arc.push(P(x, BY + 7 * Math.cos((k * Math.PI) / 8), z1 + 9 * Math.sin((k * Math.PI) / 8)));
    handle.setAttribute("d", open(arc));
  }

  // pointer x across the counter's screen width sets the travel; the endpoints are fixed ground points
  const sxA = P(CX0, CY1, CH)[0], sxB = P(CX1, CY0, CH)[0];
  const sp = spring(0, { eps: 0.001 });
  const B = register(stage, (dt) => {
    const moving = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; drawBag(sp.x); }
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => { sp.t = clamp((p[0] - sxA) / (sxB - sxA), 0, 1); read.textContent = "bag " + Math.round(sp.t * 10); B.wake(); },
    leave: () => { sp.t = 0; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { hop = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "handover",
  means: "A bag crosses a shop counter: the pointer's place sets how far it has gone, and it hops from tray to tray.",
  rules: [1, 5, 8, 9],
  range: [6, 14, 22],
  tour: [[116, 160], [210, 160], [304, 160], null],
  mount,
});
