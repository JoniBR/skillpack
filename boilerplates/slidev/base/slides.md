---
theme: default
title: Welcome to Slidev
info: |
  ## Slidev deck scaffolded by skillpack
  Markdown-driven slides for developers, powered by Vite + Vue.

  Edit `slides.md` to make this deck your own.
class: text-center
transition: slide-left
---

<!-- @skillpack:slides skillpack-aware skills can insert deck-wide content above this point; remove only if you don't want skills to inject anything -->

# Welcome to Slidev

Markdown-driven slides for developers — scaffolded by **skillpack**.

<div class="mt-12 text-sm opacity-60">
  Press <kbd>Space</kbd> for the next slide
</div>

<!--
These are presenter notes. Open the presenter view with `?presenter` or press `P`.
-->

---
transition: fade-out
---

# What you get

A working Slidev deck wired with the official slidevjs agent skill.

- 📝 **Markdown-first** — every slide is just markdown
- 🎨 **Themable** — swap themes via the `theme:` headmatter
- ⚡ **Vite-powered** — instant HMR while you edit
- 🧑‍💻 **Code-friendly** — Shiki highlighting, line marks, magic-move
- 📤 **Portable** — export to PDF, PPTX, PNG, or host as an SPA
- 🤖 **Agent-aware** — the bundled Slidev skill teaches your editor agent the syntax

Read the [official docs](https://sli.dev) for the full feature list.

---
layout: default
---

# Code

Syntax highlighting with click-based line reveals:

```ts {1|3-5|all}
function greet(name: string): string {
  // build a friendly greeting
  return `Hello, ${name}!`;
}

console.log(greet('Slidev'));
```

Use ``` ```ts {1|2-3|all} ``` to reveal lines on click.

---
layout: center
---

# Images & media

Drop any image URL — Slidev caches remote assets at build time.

![Slidev cover](https://sli.dev/logo.svg)

Local images go in `./public/` and are referenced as `/your-image.png`.

---
layout: center
class: text-center
---

# Thank you!

Edit `slides.md`, run `pnpm dev`, and ship your deck.

[sli.dev](https://sli.dev) · [GitHub](https://github.com/slidevjs/slidev)
