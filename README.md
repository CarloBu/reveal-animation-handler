# Reveal Animation Handler

A responsive text animation system for Astro that intelligently detects and respects natural line breaks.

![Reveal Animation Handler](https://revelanimationhandler.pages.dev/revelanimationhandler.jpg)

## Features

- **Dynamic Line Break Detection**: Intelligently detects natural text flows without hardcoding
- **Responsive by Design**: Automatically adapts to any viewport size
- **Multiple Animation Types**: 
  - `title`: 3D title animation effect
  - `lines`: Smooth line-by-line reveal animation
- **Customizable Options**:
  - Animation duration
  - Delay timing
  - Stagger effects
  - Opacity fades
- **Zero External CSS Required**: All styling is included inline
- **Viewport-Aware**: Elements only animate when they enter the viewport
- **Astro Integration**: Works seamlessly with Astro's view transitions

## Installation

```bash
npm install gsap
```

Then copy the `RevealAnimationHandler.ts` to your project's utils folder:

```
src/utils/RevealAnimationHandler.ts
```

## Usage

Import the animation handler in your Astro layout or component:

```astro
---
// In your Layout.astro or where you want to initialize animations
import '../utils/RevealAnimationHandler.ts';
---
```

Add the `data-reveal` attribute to any text element you want to animate:

```html
<!-- Simple line-by-line animation -->
<p data-reveal="lines">
  This text will animate line by line as it becomes visible.
</p>

<!-- 3D title animation with fade -->
<h1 data-reveal="title" data-reveal-fade>
  This title will animate with a 3D effect and fade in.
</h1>

<!-- Customized animation timing -->
<h2 data-reveal="lines" data-reveal-duration="1.2" data-reveal-delay="0.5" data-reveal-stagger="0.15">
  This will animate slower, with a delay, and more time between lines.
</h2>
```

## How It Works

FluidReveal solves common text animation problems through a 4-step process:

1. **Intelligent Detection**: Text elements are temporarily cloned to analyze where text naturally breaks across lines
2. **Smart Conversion**: Text is transformed into individually animatable lines while preserving original formatting
3. **Smooth Animation**: Customizable reveal animations with 3D effects, fades, and staggered timing are applied
4. **Responsive Adaptation**: On window resize, text reverts to single element that text lines breaks form natively.

This approach avoids common issues with text animations:
- No need to manually hardcode line breaks
- Content updates don't break animations
- Perfect for dynamic content from CMS
- Works seamlessly with responsive designs
- Different device widths handled automatically

## Options

| Attribute              | Description                                   | Default | Example                     |
|------------------------|-----------------------------------------------|---------|-----------------------------|
| `data-reveal`          | Animation type: "title" or "lines"            | "lines" | `data-reveal="title"`       |
| `data-reveal-duration` | Animation duration in seconds                 | 0.75    | `data-reveal-duration="1.5"`|
| `data-reveal-delay`    | Delay before animation in seconds             | 0       | `data-reveal-delay="0.2"`   |
| `data-reveal-stagger`  | Time between animated elements in seconds     | 0.1     | `data-reveal-stagger="0.05"`|
| `data-reveal-fade`     | Add opacity animation (true/false)            | false   | `data-reveal-fade`          |

## Browser Support

FluidReveal works in all modern browsers that support:
- Intersection Observer API

## License

MIT License

## Credits

Built with [GSAP](https://greensock.com/gsap/) and [Astro](https://astro.build/)
# reveal-animation-handler
