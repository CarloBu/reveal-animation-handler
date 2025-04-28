/**
	The Reveal Animator

	This script handles revealing text elements with data-reveal attributes
	when they become visible in the viewport using GSAP animations.
	All styling is included inline and no external CSS is required.
	
	### TEXT REVEAL TYPES:
	data-reveal="perspective" - Animates text with a 3D perspective effect
	data-reveal="slide" - Animates text line by line with a reveal effect

	### Text Reveal Properties
	data-reveal-fade - Add opacity animation (boolean attribute)
	data-reveal-blur - Add blur and opacity animation (boolean attribute)
	data-reveal-duration="0.75" - Duration of animation in seconds (default: 0.75)
	data-reveal-delay="0.1" - Delay before animation starts in seconds (default: 0.1)
	data-reveal-stagger="0.1" - Stagger time between animated elements (default: varies by animation type)
	data-reveal-keep-will-change - If present, keeps will-change: transform after animation (default: false)

	 */

import { gsap } from 'gsap';

// Default animation values
const DEFAULT_ANIMATION_VALUES = {
	DURATION: 0.75,
	DELAY: 0,
	STAGGER: 0.1,
};

// Common selectors used throughout the code
const SELECTORS = {
	NESTED_TEXT_ELEMENTS: 'h1, h2, h3, h4, h5, h6, p, li',
	SPLIT_WORD: '.split-word',
};

interface AnimationOptions {
	duration?: number;
	delay?: number;
	stagger?: number;
	fade?: boolean;
	blur?: boolean;
	keepWillChange?: boolean;
}

const ACCESSIBILITY = {
	SR_ONLY_CLASS: 'sr-only',
	SR_ONLY_STYLE:
		'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;',
};

/**
 * Standardize animation options by applying defaults
 */
const standardizeOptions = (element: HTMLElement): AnimationOptions => {
	return {
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
		blur: element.hasAttribute('data-reveal-blur'),
		keepWillChange: element.hasAttribute('data-reveal-keep-will-change'),
	};
};

// Store animated elements and their original text
const animatedElements: HTMLElement[] = [];
let resizeTimeout: number | null = null;

// Helper: apply minimal inline style after animation is done
const applyCleanStyles = (
	node: HTMLElement,
	isSpan: boolean,
	keepWillChange: boolean
): void => {
	const base = `${
		isSpan ? 'display: inline-block;' : 'display: block;'
	} opacity: 1;`;
	node.style.cssText = keepWillChange
		? `${base} will-change: transform;`
		: base;
};

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
			// Only restore text-based animations (slide, perspective)
			if (animType && ['slide', 'perspective'].includes(animType)) {
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

	// Ensure the sr-only span is present after restoring
	insertSrOnlyText(element);

	// Apply any styling that might have been applied during animation
	if (originalStyle.opacity !== '0') {
		element.style.opacity = originalStyle.opacity;
	}

	// If this element acts as a container for grouped line reveal, ensure nested text elements are visible
	if (
		['slide', 'perspective'].includes(element.getAttribute('data-reveal') || '')
	) {
		const nestedTextEls = element.querySelectorAll<HTMLElement>(
			SELECTORS.NESTED_TEXT_ELEMENTS
		);
		nestedTextEls.forEach((nested) => {
			// Only override opacity if not explicitly set from CSS elsewhere
			nested.style.opacity = '1';
		});
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
			const options = standardizeOptions(element);

			// Detect if this element acts as a container for multiple text nodes
			const nestedTextElements = Array.from(
				element.querySelectorAll<HTMLElement>(SELECTORS.NESTED_TEXT_ELEMENTS)
			);

			// Whether the element contains nested text elements to treat as a grouped container
			const hasNestedElements = nestedTextElements.length > 0;

			// Trigger appropriate animation based on data-reveal value
			switch (animType) {
				case 'perspective':
					if (hasNestedElements) {
						animateGroupedPerspective(element, nestedTextElements, options);
					} else {
						animatePerspective(element, options);
					}
					break;
				case 'slide':
					if (hasNestedElements) {
						animateGroupedSlide(element, nestedTextElements, options);
					} else {
						animateSlide(element, options);
					}
					break;
				default:
					// Default to object animation for any unspecified animation type
					animateSlide(element, options);
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
 * Generate HTML for line-based animations
 */
const generateLinesHTML = (
	lines: string[],
	useOverflowHidden: boolean,
	use3D: boolean = false
): string => {
	return lines
		.map((line) => {
			const divStyles = use3D
				? `display: block; transform-origin: 50% 0; transform-style: preserve-3d; overflow: ${
						!useOverflowHidden ? 'visible' : 'hidden'
				  };`
				: `display: block; overflow: ${
						!useOverflowHidden ? 'visible' : 'hidden'
				  }; will-change: transform;`;

			const spanStyles = use3D
				? `display: inline-block; transform: translateY(100%); transform-origin: 50% 0; will-change: transform;`
				: `display: inline-block; transform: translateY(100%); will-change: transform;`;

			return `<div style="${divStyles}">
						<span style="${spanStyles}">
							${line}
						</span>
					</div>`;
		})
		.join('');
};

/**
 * Animate text with perspective style (3D effect)
 */
const animatePerspective = (
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

	// Mark the animated container as hidden from assistive tech
	container.setAttribute('aria-hidden', 'true');

	// We will add the sr-only span AFTER clearing the element so it persists

	// Create HTML structure with 3D styling for each line
	const linesHTML = generateLinesHTML(
		lines,
		!(options.fade || options.blur),
		true
	);

	container.innerHTML = linesHTML;
	// Clear current content then insert sr-only span followed by container
	element.innerHTML = '';
	insertSrOnlyText(element);
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

		// Get keepWillChange flag from options
		const keepWillChange = options.keepWillChange || false;

		// Animate the entire line as a single element
		if (options.blur) {
			// For blur animation, only animate y position on the span
			timeline.fromTo(
				lineSpan,
				{ y: '300%' },
				{
					y: 0,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
					onComplete: () => {
						applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
					},
				},
				lineDelay
			);

			// Apply blur animation only to the line element
			timeline.fromTo(
				lineElement,
				{
					rotateX: '-75deg',
					rotateY: '0deg',
					z: '2rem',
					opacity: 0,
					filter: 'blur(25px)',
				},
				{
					rotateX: '0deg',
					rotateY: '0deg',
					z: '0rem',
					opacity: 1,
					filter: 'blur(0px)',
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quad.out',
					onComplete: () => {
						applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
					},
				},
				lineDelay
			);
		} else if (options.fade) {
			timeline.fromTo(
				lineSpan,
				{ y: '300%', opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
					onComplete: () => {
						applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
					},
				},
				lineDelay
			);

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
					onComplete: () => {
						applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
					},
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
					onComplete: () => {
						applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
					},
				},
				lineDelay
			);

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
					onComplete: () => {
						applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
					},
				},
				lineDelay
			);
		}
	});
};

/**
 * Animate a single line element with its containing span
 * Used by both animateSlide and animateGroupedSlide to avoid code duplication
 */
const animateSingleLine = (
	lineElement: Element,
	lineIndex: number,
	totalLines: number,
	timeline: gsap.core.Timeline,
	options: AnimationOptions,
	keepWillChange: boolean
): void => {
	// Get the span containing the line text
	const lineSpan = lineElement.querySelector('span');
	if (!lineSpan) return;

	// Calculate the delay for this line based on its index and the stagger value
	const lineDelay =
		lineIndex * (options.stagger || DEFAULT_ANIMATION_VALUES.STAGGER);

	// Calculate the duration for the span and line animations
	const spanDuration = options.duration || DEFAULT_ANIMATION_VALUES.DURATION;
	const lineDuration = spanDuration * 1.5; // Line animation is 1.5 times slower

	// Calculate the progressive starting position - 0% for first line, 50% for last line
	const progressiveOffset =
		totalLines > 1 ? (lineIndex / (totalLines - 1)) * 50 : 0;

	// Animate with blur, fade or without based on options
	if (options.blur) {
		// For blur animation, only animate the span's y position, but apply blur to the line element
		timeline.fromTo(
			lineSpan,
			{ y: '100%' },
			{
				y: 0,
				duration: spanDuration,
				ease: 'quart.out',
				onComplete: () => {
					applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
				},
			},
			lineDelay
		);

		// Animate the line element with blur and opacity
		timeline.fromTo(
			lineElement,
			{
				y: `${progressiveOffset}%`,
				opacity: 0,
				filter: 'blur(25px)',
			},
			{
				y: 0,
				opacity: 1,
				filter: 'blur(0px)',
				duration: lineDuration,
				ease: 'quart.out',
				onComplete: () => {
					applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
				},
			},
			lineDelay
		);
	} else if (options.fade) {
		timeline.fromTo(
			lineSpan,
			{ y: '100%', opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: spanDuration,
				ease: 'quart.out',
				// Clean span as soon as its specific animation completes
				onComplete: () => {
					applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
				},
			},
			lineDelay
		);

		// Animate the line element with progressive starting position
		timeline.fromTo(
			lineElement,
			{ y: `${progressiveOffset}%`, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: lineDuration,
				ease: 'quart.out',
				onComplete: () => {
					applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
				},
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
				// Clean span as soon as its specific animation completes
				onComplete: () => {
					applyCleanStyles(lineSpan as HTMLElement, true, keepWillChange);
				},
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
				onComplete: () => {
					applyCleanStyles(lineElement as HTMLElement, false, keepWillChange);
				},
			},
			lineDelay
		);
	}
};

/**
 * Animate text by sliding lines
 */
const animateSlide = (
	element: HTMLElement,
	options: AnimationOptions
): void => {
	// Reset opacity
	element.style.opacity = '1';

	// Split text into lines
	const lines = splitTextIntoLines(element);

	// Create container
	const container = document.createElement('div');

	// Mark this animated container as hidden from assistive tech
	container.setAttribute('aria-hidden', 'true');

	// Create HTML structure for each line
	const linesHTML = generateLinesHTML(lines, !options.fade);

	container.innerHTML = linesHTML;
	// Clear current content then insert sr-only span followed by container
	element.innerHTML = '';
	insertSrOnlyText(element);
	element.appendChild(container);

	// Get all elements for animation
	const lineElements = container.querySelectorAll('div');
	const totalLines = lineElements.length;

	// Create GSAP timeline
	const timeline = gsap.timeline({
		delay: options.delay || 0,
	});

	// Animate each line
	lineElements.forEach((lineElement, lineIndex) => {
		// Use keepWillChange from options instead of checking attribute again
		const keepWillChange = options.keepWillChange || false;
		animateSingleLine(
			lineElement,
			lineIndex,
			totalLines,
			timeline,
			options,
			keepWillChange
		);
	});
};

/**
 * Split text into lines to properly handle line breaks
 */
const splitTextIntoLines = (element: HTMLElement): string[] => {
	// Preserve the original HTML so it can be restored later
	const originalHTML = element.innerHTML;

	// Create a clone for analysis
	const { parentClone, elementClone } = createAnalysisClone(element);
	if (!parentClone) return [originalHTML];

	// Perform word splitting
	const wordSpans = splitWordsInElement(elementClone);
	if (wordSpans.length === 0) {
		parentClone.remove();
		return [originalHTML];
	}

	// Group words into lines
	const lineGroups = groupWordsByLine(wordSpans);

	// Extract HTML for each line
	const linesHTML = buildLinesHTML(lineGroups);

	// Clean up - remove the temporary elements
	parentClone.remove();

	// Restore the original content
	element.innerHTML = originalHTML;

	return linesHTML;
};

/**
 * Creates a clone of the element for text analysis
 */
const createAnalysisClone = (
	element: HTMLElement
): { parentClone: HTMLElement | null; elementClone: HTMLElement } => {
	// Clone the entire parent element to maintain layout context
	const parentClone = element.parentElement?.cloneNode(false) as HTMLElement;
	if (!parentClone) return { parentClone: null, elementClone: element };

	// Copy parent element styles and positioning
	parentClone.style.cssText = window.getComputedStyle(
		element.parentElement as HTMLElement
	).cssText;
	parentClone.style.position = 'absolute';
	parentClone.style.top = '0';
	parentClone.style.left = '0';
	parentClone.style.visibility = 'hidden';
	parentClone.style.pointerEvents = 'none';

	// Deep-clone the element so ALL inline markup (<span>, <em>, etc.) is preserved
	const elementClone = element.cloneNode(true) as HTMLElement;
	const elementStyle = window.getComputedStyle(element);
	elementClone.style.cssText = elementStyle.cssText;
	elementClone.style.position = 'static';
	elementClone.style.width = elementStyle.width;
	elementClone.style.height = 'auto';
	elementClone.style.transform = 'none';

	// Add the cloned element to the cloned parent
	parentClone.appendChild(elementClone);

	// Add the parent clone to the document
	document.body.appendChild(parentClone);

	return { parentClone, elementClone };
};

/**
 * Splits element's content into individual word spans
 */
const splitWordsInElement = (elementClone: HTMLElement): HTMLElement[] => {
	// Wrap every WORD in an inline-block span (.split-word)
	// We only process TEXT nodes, leaving any existing inline markup intact
	let wordIndex = 0;
	const walker = document.createTreeWalker(elementClone, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	while (walker.nextNode()) {
		textNodes.push(walker.currentNode as Text);
	}

	textNodes.forEach((textNode) => {
		const parts = (textNode.textContent || '').split(/(\s+)/);
		const frag = document.createDocumentFragment();

		parts.forEach((part) => {
			if (part === '') return;
			if (/^\s+$/.test(part)) {
				// Preserve whitespace exactly
				frag.appendChild(document.createTextNode(part));
			} else {
				const span = document.createElement('span');
				span.className = 'split-word';
				span.style.display = 'inline-block';
				span.dataset.wordIndex = String(wordIndex++);
				span.textContent = part;
				frag.appendChild(span);
			}
		});

		textNode.parentNode?.replaceChild(frag, textNode);
	});

	// Get all word spans for grouping into lines
	return Array.from(
		elementClone.querySelectorAll<HTMLElement>(SELECTORS.SPLIT_WORD)
	);
};

/**
 * Groups words into lines based on their vertical position
 */
const groupWordsByLine = (wordSpans: HTMLElement[]): HTMLElement[][] => {
	const lineGroups: HTMLElement[][] = [[]];
	let currentLine = 0;
	let prevTop = wordSpans[0].getBoundingClientRect().top;

	wordSpans.forEach((span) => {
		const top = span.getBoundingClientRect().top;
		if (Math.abs(top - prevTop) > 2) {
			currentLine++;
			prevTop = top;
			lineGroups[currentLine] = [];
		}
		lineGroups[currentLine].push(span);
	});

	return lineGroups;
};

/**
 * Builds HTML for each line from grouped word spans
 */
const buildLinesHTML = (lineGroups: HTMLElement[][]): string[] => {
	// Build HTML for each visual line, removing helper spans but preserving
	// original inline markup
	return lineGroups.map((spansInLine) => {
		if (spansInLine.length === 0) return '';

		const range = document.createRange();
		range.setStartBefore(spansInLine[0]);
		range.setEndAfter(spansInLine[spansInLine.length - 1]);
		const fragment = range.cloneContents();

		const container = document.createElement('div');
		container.appendChild(fragment);

		// Remove our helper spans while keeping their content
		container
			.querySelectorAll<HTMLElement>(SELECTORS.SPLIT_WORD)
			.forEach((helper) => {
				helper.replaceWith(...Array.from(helper.childNodes));
			});

		return container.innerHTML.trim();
	});
};

/**
 * Animate grouped text elements by lines as a single sequence.
 * This allows applying data-reveal="slide" to a container element (e.g., a div) and
 * automatically animating all nested text elements (h1–h6, p, li, etc.)
 * in the DOM order using the same gsap timeline and stagger configuration.
 */
const animateGroupedSlide = (
	container: HTMLElement,
	nestedTextElements: HTMLElement[],
	options: AnimationOptions
): void => {
	// Ensure container itself is visible before we start manipulating children
	container.style.opacity = '1';

	// Provide sr-only text on container once
	insertSrOnlyText(container);

	// Note: individual visual line containers will be hidden from assistive tech

	// Aggregate line elements across all nested text elements
	const aggregatedLineContainers: HTMLElement[] = [];

	// Iterate over each nested text element and replace its HTML with split lines structure
	nestedTextElements.forEach((nestedEl) => {
		// Reset opacity for nested element (in case it had explicit css)
		nestedEl.style.opacity = '1';

		// Split the nested element text into visual lines
		const lines = splitTextIntoLines(nestedEl);

		// Build HTML for this nested element similar to animateSlide
		const nestedContainer = document.createElement('div');
		nestedContainer.setAttribute('aria-hidden', 'true');
		nestedContainer.innerHTML = generateLinesHTML(lines, !options.fade);

		// Replace nested element's contents with the generated structure
		nestedEl.innerHTML = '';
		nestedEl.appendChild(nestedContainer);

		// Collect the line <div> elements for animation sequencing
		aggregatedLineContainers.push(
			...Array.from(nestedContainer.querySelectorAll('div'))
		);
	});

	const totalLines = aggregatedLineContainers.length;

	if (totalLines === 0) return; // Nothing to animate

	// Create a single GSAP timeline for the entire group
	const timeline = gsap.timeline({
		delay: options.delay || 0,
	});

	// Iterate over all collected line containers sequentially
	aggregatedLineContainers.forEach((lineElement, globalIndex) => {
		const keepWillChange = options.keepWillChange || false;
		animateSingleLine(
			lineElement,
			globalIndex,
			totalLines,
			timeline,
			options,
			keepWillChange
		);
	});
};

/**
 * Animate grouped text elements with 3D perspective effect.
 * This allows applying data-reveal="perspective" to a container element (e.g., a div) and
 * automatically animating all nested text elements (h1–h6, p, li, etc.)
 * in the DOM order using the same gsap timeline and stagger configuration.
 */
const animateGroupedPerspective = (
	container: HTMLElement,
	nestedTextElements: HTMLElement[],
	options: AnimationOptions
): void => {
	// Ensure container itself is visible before we start manipulating children
	container.style.opacity = '1';

	// Provide sr-only text on container once
	insertSrOnlyText(container);

	// Note: individual visual line containers will be hidden from assistive tech

	// Aggregate line elements across all nested text elements
	const aggregatedLineContainers: HTMLElement[] = [];

	// Iterate over each nested text element and replace its HTML with 3D perspective structure
	nestedTextElements.forEach((nestedEl) => {
		// Reset opacity for nested element (in case it had explicit css)
		nestedEl.style.opacity = '1';

		// Split the nested element text into visual lines
		const lines = splitTextIntoLines(nestedEl);

		// Create container with perspective
		const nestedContainer = document.createElement('div');
		nestedContainer.style.perspective = '1000px';
		nestedContainer.setAttribute('aria-hidden', 'true');

		// Create HTML structure with 3D effect
		nestedContainer.innerHTML = generateLinesHTML(
			lines,
			!(options.fade || options.blur),
			true
		);

		// Replace nested element's contents with the 3D structure
		nestedEl.innerHTML = '';
		nestedEl.appendChild(nestedContainer);

		// Collect the line <div> elements for animation sequencing
		aggregatedLineContainers.push(
			...Array.from(nestedContainer.querySelectorAll('div'))
		);
	});

	const totalLines = aggregatedLineContainers.length;

	if (totalLines === 0) return; // Nothing to animate

	// Create a single GSAP timeline for the entire group
	const timeline = gsap.timeline({
		delay: options.delay || 0,
	});

	// Iterate over all collected line containers sequentially
	aggregatedLineContainers.forEach((lineElement, globalIndex) => {
		// Get the span containing the line text
		const lineSpan = lineElement.querySelector('span');
		if (!lineSpan) return;

		// Calculate delay based on stagger
		const lineDelay =
			globalIndex * (options.stagger || DEFAULT_ANIMATION_VALUES.STAGGER);

		// Apply 3D perspective animation
		if (options.blur) {
			// For blur animation, only animate y position on the span
			timeline.fromTo(
				lineSpan,
				{ y: '300%' },
				{
					y: 0,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
					onComplete: () => {
						applyCleanStyles(
							lineSpan as HTMLElement,
							true,
							options.keepWillChange || false
						);
					},
				},
				lineDelay
			);

			// Apply blur animation only to the line element
			timeline.fromTo(
				lineElement,
				{
					rotateX: '-75deg',
					rotateY: '0deg',
					z: '2rem',
					opacity: 0,
					filter: 'blur(25px)',
				},
				{
					rotateX: '0deg',
					rotateY: '0deg',
					z: '0rem',
					opacity: 1,
					filter: 'blur(0px)',
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quad.out',
					onComplete: () => {
						applyCleanStyles(
							lineElement as HTMLElement,
							false,
							options.keepWillChange || false
						);
					},
				},
				lineDelay
			);
		} else if (options.fade) {
			timeline.fromTo(
				lineSpan,
				{ y: '300%', opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: options.duration || DEFAULT_ANIMATION_VALUES.DURATION,
					ease: 'quart.out',
					onComplete: () => {
						applyCleanStyles(
							lineSpan as HTMLElement,
							true,
							options.keepWillChange || false
						);
					},
				},
				lineDelay
			);

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
					onComplete: () => {
						applyCleanStyles(
							lineElement as HTMLElement,
							false,
							options.keepWillChange || false
						);
					},
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
					onComplete: () => {
						applyCleanStyles(
							lineSpan as HTMLElement,
							true,
							options.keepWillChange || false
						);
					},
				},
				lineDelay
			);

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
					onComplete: () => {
						applyCleanStyles(
							lineElement as HTMLElement,
							false,
							options.keepWillChange || false
						);
					},
				},
				lineDelay
			);
		}
	});
};

function insertSrOnlyText(element: HTMLElement): void {
	// Avoid duplicating the helper span on subsequent calls
	if (element.querySelector(`.${ACCESSIBILITY.SR_ONLY_CLASS}`)) return;

	const originalText =
		(element as any).originalText || element.textContent || '';
	if (!originalText.trim()) return;

	const srSpan = document.createElement('span');
	srSpan.className = ACCESSIBILITY.SR_ONLY_CLASS;
	srSpan.textContent = originalText;
	srSpan.style.cssText = ACCESSIBILITY.SR_ONLY_STYLE;

	// Prepend so it is encountered first by screen readers
	element.prepend(srSpan);
}

// Add standard DOM content loaded event to ensure initialization
document.addEventListener('DOMContentLoaded', () => {
	initTextAnimations();
});

// For client-side navigation without view transitions
window.addEventListener('popstate', () => {
	// Reset the state of animated elements
	animatedElements.forEach((element) => {
		restoreOriginalText(element);
	});

	// Clear animated elements array
	animatedElements.length = 0;

	// Reinitialize animations
	initTextAnimations();
});

// Export the init function for manual initialization if needed
export { initTextAnimations };
