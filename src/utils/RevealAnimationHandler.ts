/**
	The Reveal Animator

	This script handles revealing text elements with data-reveal attributes
	when they become visible in the viewport using GSAP animations.
	All styling is included inline and no external CSS is required.
	
	### TEXT REVEAL TYPES:
	data-reveal="title-words" - Animates a title word by word with 3D effect
	data-reveal="title" - Animates text with a 3D title effect
	data-reveal="lines" - Animates text line by line with a reveal effect

	### Text Reveal Properties
	data-reveal-fade - Add opacity animation (boolean attribute)
	data-reveal-duration="0.75" - Duration of animation in seconds (default: 0.75)
	data-reveal-delay="0.1" - Delay before animation starts in seconds (default: 0.1)
	data-reveal-stagger="0.1" - Stagger time between animated elements (default: varies by animation type)

	 */

import { gsap } from 'gsap';

// Default animation values
const DEFAULT_ANIMATION_VALUES = {
	DURATION: 0.75,
	DELAY: 0,
	STAGGER: 0.1,
};

interface AnimationOptions {
	duration?: number;
	delay?: number;
	stagger?: number;
	fade?: boolean;
}

// Store animated elements and their original text
const animatedElements: HTMLElement[] = [];
let resizeTimeout: number | null = null;

/**
 * Initializes animations by finding elements with data-reveal attribute
 * and setting up intersection observers
 */
const initTextAnimations = (): void => {
	// Initialize the observer
	const observer = new IntersectionObserver(
		(entries) => handleIntersection(entries, observer),
		{
			root: null,
			rootMargin: '0px',
			threshold: 0.1,
		}
	);

	// Find all elements with data-reveal attribute
	const elements = document.querySelectorAll('[data-reveal]');

	elements.forEach((element) => {
		const htmlElement = element as HTMLElement;

		// Store original text content
		(htmlElement as any).originalText = htmlElement.innerHTML;

		// Set initial opacity to 0 directly if it's not already set
		if (htmlElement.style.opacity !== '0') {
			htmlElement.style.opacity = '0';
		}

		// Add to animated elements array
		animatedElements.push(htmlElement);

		// Start observing the element
		observer.observe(htmlElement);
	});

	// Add window resize event listener
	window.addEventListener('resize', handleWindowResize);
};

/**
 * Handles window resize events
 * Restores only text-based animated elements to their original form
 */
const handleWindowResize = (): void => {
	// Use a timeout to prevent excessive function calls during resize
	if (resizeTimeout !== null) {
		window.clearTimeout(resizeTimeout);
	}

	resizeTimeout = window.setTimeout(() => {
		// Process only text-based animated elements
		animatedElements.forEach((element) => {
			const animType = element.getAttribute('data-reveal');
			// Only restore text-based animations (lines, title)
			if (animType && ['lines', 'title'].includes(animType)) {
				restoreOriginalText(element);
			}
		});
	}, 10);
};

/**
 * Restores an element to its original text form
 * Preserves styling and animations already applied
 */
const restoreOriginalText = (element: HTMLElement): void => {
	// Skip if element doesn't have originalText property
	if (!(element as any).originalText) return;

	// Get computed style of the element
	const computedStyle = window.getComputedStyle(element);
	const originalStyle = {
		color: computedStyle.color,
		fontWeight: computedStyle.fontWeight,
		fontSize: computedStyle.fontSize,
		lineHeight: computedStyle.lineHeight,
		letterSpacing: computedStyle.letterSpacing,
		textAlign: computedStyle.textAlign,
		opacity: computedStyle.opacity,
	};

	// Get all text content from child spans while preserving line breaks
	const textContent = extractTextWithLineBreaks(element);

	// Restore original HTML
	element.innerHTML = (element as any).originalText;

	// Apply any styling that might have been applied during animation
	if (originalStyle.opacity !== '0') {
		element.style.opacity = originalStyle.opacity;
	}

	// Clear any transform properties to prevent performance issues
	element.style.transform = 'none';
	element.style.transformOrigin = '';
	element.style.willChange = 'auto';

	// Remove any 3D transform properties if they exist
	element.style.perspective = '';
	element.style.transformStyle = '';
};

/**
 * Extract text from an element while preserving line breaks
 */
const extractTextWithLineBreaks = (element: HTMLElement): string => {
	let result = '';
	const lineElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

	if (lineElements.length > 0) {
		// Extract text by lines
		lineElements.forEach((lineElement, index) => {
			result += lineElement.textContent;
			// Add line break if not the last line
			if (index < lineElements.length - 1) {
				result += '\n';
			}
		});
	} else {
		// If no line elements, just get the text content
		result = element.textContent || '';
	}

	return result;
};

/**
 * Handles intersection events for animated elements
 */
const handleIntersection = (
	entries: IntersectionObserverEntry[],
	observer: IntersectionObserver
): void => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			const element = entry.target as HTMLElement;
			const animType = element.getAttribute('data-reveal');

			// Stop observing once animation is triggered
			observer.unobserve(element);

			// Get animation options
			const options: AnimationOptions = {
				duration: getAttributeValue(
					element,
					'data-reveal-duration',
					DEFAULT_ANIMATION_VALUES.DURATION
				),
				delay: getAttributeValue(
					element,
					'data-reveal-delay',
					DEFAULT_ANIMATION_VALUES.DELAY
				),
				stagger: getAttributeValue(
					element,
					'data-reveal-stagger',
					DEFAULT_ANIMATION_VALUES.STAGGER
				),
				fade: element.hasAttribute('data-reveal-fade'),
			};

			// Trigger appropriate animation based on data-reveal value
			switch (animType) {
				case 'title':
					animate3DTitle(element, options);
					break;
				case 'lines':
					animateLines(element, options);
					break;
				default:
					// Default to object animation for any unspecified animation type
					animateLines(element, options);
			}
		}
	});
};

/**
 * Get numeric attribute value with fallback
 */
const getAttributeValue = (
	element: HTMLElement,
	attr: string,
	defaultValue: number
): number => {
	const value = element.getAttribute(attr);
	return value ? parseFloat(value) : defaultValue;
};

/**
 * Animate text with title style (3D effect)
 */
const animate3DTitle = (
	element: HTMLElement,
	options: AnimationOptions
): void => {
	// Reset opacity
	element.style.opacity = '1';

	// Split text into lines
	const lines = splitTextIntoLines(element);

	// Create container with perspective
	const container = document.createElement('div');
	container.style.perspective = '1000px';

	// Create HTML structure with one span per line instead of per word
	const linesHTML = lines
		.map((line) => {
			return `<div style="display: block; transform-origin: 50% 0; transform-style: preserve-3d; overflow: ${
				options.fade ? 'visible' : 'hidden'
			};">
						<span style="display: inline-block; transform: translateY(100%); transform-origin: 50% 0; will-change: transform;">
							${line}
						</span>
					</div>`;
		})
		.join('');

	container.innerHTML = linesHTML;
	element.innerHTML = '';
	element.appendChild(container);

	// Get all elements for animation
	const lineElements = container.querySelectorAll('div');

	// Create GSAP timeline
	const timeline = gsap.timeline({
		delay: options.delay || 0,
	});

	// Animate each line
	lineElements.forEach((lineElement, lineIndex) => {
		// Get the span containing the line text
		const lineSpan = lineElement.querySelector('span');

		// Calculate the delay for each line based on the line index and the stagger value
		const lineDelay =
			lineIndex * (options.stagger || DEFAULT_ANIMATION_VALUES.STAGGER);

		// Animate the entire line as a single element
		if (options.fade) {
			timeline.fromTo(
				lineSpan,
				{ y: '300%', opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
				},
				lineDelay
			);
		} else {
			timeline.fromTo(
				lineSpan,
				{ y: '300%' },
				{
					y: 0,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
				},
				lineDelay
			);
		}

		// Apply 3D rotation to the entire line
		timeline.fromTo(
			lineElement,
			{
				rotateX: '-75deg',
				rotateY: '0deg',
				z: '2rem',
			},
			{
				rotateX: '0deg',
				rotateY: '0deg',
				z: '0rem',
				duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
				ease: 'quad.out',
			},
			lineDelay
		);
	});
};

/**
 * Animate text by lines
 */
const animateLines = (
	element: HTMLElement,
	options: AnimationOptions
): void => {
	// Reset opacity
	element.style.opacity = '1';

	// Split text into lines
	const lines = splitTextIntoLines(element);

	// Create container
	const container = document.createElement('div');

	// Create HTML structure with one span per line instead of per word
	const linesHTML = lines
		.map((line) => {
			return `<div style="display: block; overflow: ${
				options.fade ? 'visible' : 'hidden'
			}; will-change: transform;">
						<span style="display: inline-block; transform: translateY(100%); will-change: transform;">
							${line}
						</span>
					</div>`;
		})
		.join('');

	container.innerHTML = linesHTML;
	element.innerHTML = '';
	element.appendChild(container);

	// Get all elements for animation
	const lineElements = container.querySelectorAll('div');
	const totalLines = lineElements.length;

	// Create GSAP timeline
	const timeline = gsap.timeline({
		delay: options.delay || 0,
		onComplete: () => {
			// No need to restore original content anymore
		},
	});

	// Animate each line
	lineElements.forEach((lineElement, lineIndex) => {
		// Get the span containing the line text
		const lineSpan = lineElement.querySelector('span');

		// Calculate the delay for each line based on the line index and the stagger value
		const lineDelay =
			lineIndex * (options.stagger || DEFAULT_ANIMATION_VALUES.STAGGER);

		// Calculate the duration for the span and line animations
		const spanDuration = options.duration || DEFAULT_ANIMATION_VALUES.DURATION;
		const lineDuration = spanDuration * 1.5; // Line animation is 1.5 times slower

		// Calculate the progressive starting position - 0% for first line, 50% for last line
		const progressiveOffset =
			totalLines > 1 ? (lineIndex / (totalLines - 1)) * 50 : 0;

		// Animate the entire line as a single element
		if (options.fade) {
			timeline.fromTo(
				lineSpan,
				{ y: '100%', opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: spanDuration,
					ease: 'quart.out',
				},
				lineDelay
			);

			// Animate the line element with progressive starting position
			timeline.fromTo(
				lineElement,
				{
					y: `${progressiveOffset}%`,
					opacity: options.fade ? 0 : 1,
				},
				{
					y: 0,
					opacity: 1,
					duration: lineDuration,
					ease: 'quart.out',
				},
				lineDelay
			);
		} else {
			timeline.fromTo(
				lineSpan,
				{ y: '100%' },
				{
					y: 0,
					duration: spanDuration,
					ease: 'quart.out',
				},
				lineDelay
			);

			// Animate the line element with progressive starting position
			timeline.fromTo(
				lineElement,
				{ y: `${progressiveOffset}%` },
				{
					y: 0,
					duration: lineDuration,
					ease: 'quart.out',
				},
				lineDelay
			);
		}
	});
};

/**
 * Split text into lines to properly handle line breaks
 */
const splitTextIntoLines = (element: HTMLElement): string[] => {
	// Store original content for temporary use within this function
	const originalContent = element.innerHTML;

	// Clean and normalize the text content
	const text = element.textContent || '';
	const normalizedText = text.replace(/\s+/g, ' ').trim();

	const words = normalizedText.split(' ').filter((word) => word.length > 0);

	// Clone the entire parent element to maintain layout context
	const parentClone = element.parentElement?.cloneNode(false) as HTMLElement;
	if (!parentClone) return [normalizedText];

	// Copy parent element styles and positioning
	parentClone.style.cssText = window.getComputedStyle(
		element.parentElement as HTMLElement
	).cssText;
	parentClone.style.position = 'absolute';
	parentClone.style.top = '0';
	parentClone.style.left = '0';
	parentClone.style.visibility = 'hidden';
	parentClone.style.pointerEvents = 'none';

	// Create a clone of the original element
	const elementClone = element.cloneNode(false) as HTMLElement;
	elementClone.style.cssText = window.getComputedStyle(element).cssText;
	elementClone.style.position = 'static';
	elementClone.style.width = getComputedStyle(element).width;
	elementClone.style.height = 'auto';
	elementClone.style.transform = 'none';

	// Add the cloned element to the cloned parent
	parentClone.appendChild(elementClone);

	// Add the parent clone to the document
	document.body.appendChild(parentClone);

	// Wrap each word in a span inside the cloned element
	elementClone.innerHTML = words
		.map(
			(word, index) =>
				`<span class="split-word" style="display: inline-block;" data-word-index="${index}">${word}</span>`
		)
		.join(' ');

	// Get all word spans we just created
	const wordSpans = elementClone.querySelectorAll(
		'.split-word'
	) as NodeListOf<HTMLElement>;
	const lines: Array<string[]> = [[]];
	let currentLine = 0;

	if (wordSpans.length > 0) {
		let prevTop = wordSpans[0].getBoundingClientRect().top;

		wordSpans.forEach((span) => {
			const rect = span.getBoundingClientRect();

			// If this word is on a new line (different Y position)
			if (Math.abs(rect.top - prevTop) > 2) {
				currentLine++;
				prevTop = rect.top;
				lines[currentLine] = [];
			}

			lines[currentLine].push(span.textContent || '');
		});
	}

	// Clean up - remove the temporary elements
	parentClone.remove();

	// Restore the original content
	element.innerHTML = originalContent;

	return lines.map((lineWords) => lineWords.join(' '));
};

// Add standard DOM content loaded event to ensure initialization
document.addEventListener('astro:page-load', () => {
	initTextAnimations();
});

// Clean up event listeners when the page is unloaded
document.addEventListener('astro:before-preparation', () => {
	window.removeEventListener('resize', handleWindowResize);
	if (resizeTimeout !== null) {
		window.clearTimeout(resizeTimeout);
	}
});
