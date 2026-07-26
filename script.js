/*
  Bring Our Garden Together
  A lightweight pointer-driven drag-and-drop experience. No dependencies needed.
*/
(() => {
  'use strict';

  const FLOWER_COUNT = 25;
  const stage = document.getElementById('garden-stage');
  const gardenZone = document.getElementById('garden-zone');
  const progressText = document.getElementById('progress-text');
  const progressPill = document.querySelector('.progress-pill');
  const introCard = document.getElementById('intro-card');
  const sparkleLayer = document.getElementById('sparkle-layer');
  const petalLayer = document.getElementById('petal-layer');
  const bokehLayer = document.getElementById('bokeh-layer');
  const giantDaisy = document.getElementById('giant-daisy');
  const giantPetals = document.getElementById('giant-petals');
  const letter = document.getElementById('love-letter');
  const letterText = document.getElementById('letter-text');
  const letterCursor = document.getElementById('letter-cursor');
  const pollenField = document.getElementById('pollen-field');
  const bottomNote = document.getElementById('bottom-note');
  const welcomeFlow = document.getElementById('welcome-flow');
  const welcomeScreens = [...document.querySelectorAll('.welcome-screen')];
  const messageContinue = document.getElementById('message-continue');
  const playGameButton = document.getElementById('play-game');
  const gameExperience = document.getElementById('game-experience');

  const flowers = [];
  let collectedCount = 0;
  let activeDrag = null;
  let gameLocked = false;
  let lastPetalTime = 0;
  let parallaxFrame = 0;
  let pendingParallax = { x: 0, y: 0 };

  // The Daisy markup stays small and reusable: 12 petals + a warm center.
  function makeDaisy(index) {
    const flower = document.createElement('button');
    flower.type = 'button';
    flower.className = 'daisy';
    flower.setAttribute('aria-label', `Daisy ${index + 1}. Drag it into our garden.`);
    flower.setAttribute('aria-describedby', 'progress-text');
    flower.style.setProperty('--rotation', `${randomBetween(-17, 17).toFixed(1)}deg`);
    flower.style.setProperty('--float-time', `${randomBetween(3.4, 5.7).toFixed(2)}s`);
    flower.style.setProperty('--float-delay', `${randomBetween(-5, 0).toFixed(2)}s`);

    const petalFragment = document.createDocumentFragment();
    for (let petalIndex = 0; petalIndex < 12; petalIndex++) {
      const petal = document.createElement('span');
      petal.className = 'petal';
      petal.style.transform = `translate(-50%, -100%) rotate(${petalIndex * 30}deg)`;
      petalFragment.appendChild(petal);
    }
    flower.appendChild(petalFragment);
    const center = document.createElement('span');
    center.className = 'center';
    flower.appendChild(center);
    stage.appendChild(flower);

    const item = {
      element: flower,
      index,
      rotation: parseFloat(flower.style.getPropertyValue('--rotation')) || 0,
      x: 0,
      y: 0,
      homeX: 0,
      homeY: 0,
      collected: false
    };
    wireDragEvents(item);
    return item;
  }

  function wireDragEvents(item) {
    const element = item.element;
    element.addEventListener('pointerdown', (event) => beginDrag(event, item));
    element.addEventListener('pointermove', (event) => moveDrag(event, item));
    element.addEventListener('pointerup', (event) => endDrag(event, item));
    element.addEventListener('pointercancel', (event) => cancelDrag(item));

    // A small keyboard alternative makes the garden friendlier to navigate.
    element.addEventListener('keydown', (event) => {
      if (gameLocked || item.collected || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      collectFlower(item);
    });
  }

  function showWelcomeScreen(index) {
    welcomeScreens.forEach((screen, screenIndex) => {
      const isActive = screenIndex === index;
      screen.classList.toggle('active', isActive);
      screen.classList.toggle('is-leaving', !isActive);
      screen.setAttribute('aria-hidden', String(!isActive));
    });
  }

  function beginGame() {
    // Reveal the garden only after Nawshin chooses to play her little surprise.
    welcomeFlow.classList.add('is-leaving');
    welcomeFlow.setAttribute('aria-hidden', 'true');
    gameExperience.classList.add('is-visible');
    gameExperience.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(buildScatteredGarden);
    setTimeout(() => playGameButton.blur(), 30);
  }

  function beginDrag(event, item) {
    if (gameLocked || item.collected || activeDrag) return;
    event.preventDefault();
    activeDrag = item;
    item.homeX = item.x;
    item.homeY = item.y;
    elementPoint(item, event.clientX, event.clientY);
    item.element.classList.add('dragging');
    item.element.setPointerCapture?.(event.pointerId);
    makePetalTrail(item.x, item.y, 3);
  }

  function moveDrag(event, item) {
    if (activeDrag !== item) return;
    event.preventDefault();
    elementPoint(item, event.clientX, event.clientY);
    const now = performance.now();
    if (now - lastPetalTime > 88) {
      makePetalTrail(item.x, item.y, 1);
      lastPetalTime = now;
    }
  }

  function endDrag(event, item) {
    if (activeDrag !== item) return;
    item.element.releasePointerCapture?.(event.pointerId);
    activeDrag = null;
    item.element.classList.remove('dragging');

    if (isOverGarden(event.clientX, event.clientY)) {
      collectFlower(item);
    } else {
      // Gently return the daisy to where it started if it misses the garden.
      item.x = item.homeX;
      item.y = item.homeY;
      placeFlower(item, item.x, item.y);
    }
  }

  function cancelDrag(item) {
    if (activeDrag !== item) return;
    activeDrag = null;
    item.element.classList.remove('dragging');
    item.x = item.homeX;
    item.y = item.homeY;
    placeFlower(item, item.x, item.y);
  }

  function elementPoint(item, clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    item.x = clamp(clientX - rect.left, 20, rect.width - 20);
    item.y = clamp(clientY - rect.top, 20, rect.height - 20);
    placeFlower(item, item.x, item.y);
  }

  function placeFlower(item, x, y) {
    item.element.style.left = `${x}px`;
    item.element.style.top = `${y}px`;
  }

  function isOverGarden(clientX, clientY) {
    const rect = gardenZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.hypot(clientX - centerX, clientY - centerY) < rect.width * 0.48;
  }

  function collectFlower(item) {
    if (item.collected || gameLocked) return;
    item.collected = true;
    collectedCount += 1;
    item.element.classList.remove('dragging');
    item.element.classList.add('collected');
    item.element.setAttribute('aria-label', `Daisy ${item.index + 1} is safely in our garden.`);

    const target = collectionSlot(collectedCount - 1);
    item.x = target.x;
    item.y = target.y;
    placeFlower(item, item.x, item.y);
    makeSparkles(target.x, target.y, 11);
    makePetalTrail(target.x, target.y, 5);
    updateProgress();

    if (collectedCount === 1) introCard.classList.add('is-hidden');
    if (navigator.vibrate) navigator.vibrate(12);
    if (collectedCount === FLOWER_COUNT) completeGarden();
  }

  function collectionSlot(index) {
    const stageRect = stage.getBoundingClientRect();
    const gardenRect = gardenZone.getBoundingClientRect();
    const centerX = gardenRect.left - stageRect.left + gardenRect.width / 2;
    const centerY = gardenRect.top - stageRect.top + gardenRect.height / 2;
    // A golden-angle spiral produces a natural little bouquet inside the circle.
    const angle = index * 2.3999632297;
    const radius = Math.sqrt((index + 0.45) / FLOWER_COUNT) * gardenRect.width * 0.34;
    return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  }

  function updateProgress() {
    progressText.textContent = `${collectedCount} / ${FLOWER_COUNT}`;
    progressPill.classList.remove('is-bumped');
    // Restart the understated feedback animation without forcing layout on the whole page.
    requestAnimationFrame(() => progressPill.classList.add('is-bumped'));
  }

  function makeSparkles(x, y, count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement('i');
      sparkle.className = 'sparkle';
      const angle = Math.random() * Math.PI * 2;
      const distance = randomBetween(17, 52);
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      sparkle.style.setProperty('--size', `${randomBetween(4, 10)}px`);
      fragment.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 850);
    }
    sparkleLayer.appendChild(fragment);
  }

  function makePetalTrail(x, y, count) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('i');
      petal.className = 'falling-petal';
      petal.style.left = `${x + randomBetween(-10, 10)}px`;
      petal.style.top = `${y + randomBetween(-5, 8)}px`;
      petal.style.setProperty('--fall-x', `${randomBetween(-25, 27)}px`);
      petal.style.setProperty('--fall-y', `${randomBetween(23, 58)}px`);
      petal.style.setProperty('--fall-rotate', `${randomBetween(-140, 160)}deg`);
      fragment.appendChild(petal);
      setTimeout(() => petal.remove(), 1350);
    }
    petalLayer.appendChild(fragment);
  }

  function buildScatteredGarden() {
    const occupied = [];
    const stageRect = stage.getBoundingClientRect();
    const gardenRect = gardenZone.getBoundingClientRect();
    const isSmallScreen = window.matchMedia('(max-width: 650px)').matches;
    const flowerSize = isSmallScreen ? 45 : 57;
    const gardenX = gardenRect.left - stageRect.left + gardenRect.width / 2;
    const gardenY = gardenRect.top - stageRect.top + gardenRect.height / 2;
    const protectedRadius = gardenRect.width * 0.49 + flowerSize * 0.4;
    const introRect = introCard.getBoundingClientRect();
    const intro = {
      left: introRect.left - stageRect.left - 15,
      right: introRect.right - stageRect.left + 15,
      top: introRect.top - stageRect.top - 9,
      bottom: introRect.bottom - stageRect.top + 12
    };

    flowers.forEach((flower, index) => {
      let candidate = null;
      for (let attempts = 0; attempts < 450; attempts++) {
        const x = randomBetween(flowerSize * .62, stageRect.width - flowerSize * .62);
        const y = randomBetween(isSmallScreen ? 150 : 182, stageRect.height - flowerSize * .75);
        const farFromGarden = Math.hypot(x - gardenX, y - gardenY) > protectedRadius;
        const outOfIntro = x < intro.left || x > intro.right || y < intro.top || y > intro.bottom;
        const notCrowded = occupied.every(point => Math.hypot(x - point.x, y - point.y) > flowerSize * .73);
        if (farFromGarden && outOfIntro && notCrowded) {
          candidate = { x, y };
          break;
        }
      }
      // An unobtrusive fallback keeps the game usable on very short screens.
      if (!candidate) {
        const angle = (index / FLOWER_COUNT) * Math.PI * 2 + .1;
        const radius = Math.max(protectedRadius + 25, Math.min(stageRect.width, stageRect.height) * .29);
        candidate = {
          x: clamp(gardenX + Math.cos(angle) * radius, flowerSize / 2, stageRect.width - flowerSize / 2),
          y: clamp(gardenY + Math.sin(angle) * radius, 145, stageRect.height - flowerSize / 2)
        };
      }
      occupied.push(candidate);
      flower.x = flower.homeX = candidate.x;
      flower.y = flower.homeY = candidate.y;
      placeFlower(flower, flower.x, flower.y);
    });
  }

  function completeGarden() {
    gameLocked = true;
    stage.classList.add('is-full');
    introCard.classList.add('is-hidden');
    // Let the last successful drop land before the flowers begin their final journey.
    setTimeout(beginMerge, 1000);
  }

  function beginMerge() {
    const stageRect = stage.getBoundingClientRect();
    const gardenRect = gardenZone.getBoundingClientRect();
    const centerX = gardenRect.left - stageRect.left + gardenRect.width / 2;
    const centerY = gardenRect.top - stageRect.top + gardenRect.height / 2;

    flowers.forEach((flower, index) => {
      flower.element.style.transitionDelay = `${index * 13}ms`;
      flower.element.classList.add('is-merging');
      flower.x = centerX;
      flower.y = centerY;
      placeFlower(flower, centerX, centerY);
    });

    setTimeout(() => {
      flowers.forEach(flower => flower.element.classList.add('is-hidden'));
      document.body.classList.add('is-complete');
      giantDaisy.classList.add('is-blooming');
    }, 1050);

    setTimeout(() => {
      giantDaisy.classList.add('is-dissolving');
      makeBokeh(185);
    }, 2920);

    setTimeout(() => {
      letter.classList.add('is-visible');
      bottomNote.classList.add('is-hidden');
      typeLoveLetter();
    }, 4380);
  }

  function buildGiantDaisy() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 16; i++) {
      const petal = document.createElement('span');
      petal.className = 'giant-petal';
      petal.style.transform = `translate(-50%, -100%) rotate(${i * 22.5}deg)`;
      fragment.appendChild(petal);
    }
    giantPetals.appendChild(fragment);
  }

  function makeBokeh(count) {
    const fragment = document.createDocumentFragment();
    const colors = ['#fff6b4', '#ffdfa0', '#fffdf1', '#f9cf68', '#ffe8bf'];
    const spread = Math.max(window.innerWidth, window.innerHeight) * .48;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('i');
      dot.className = 'bokeh';
      const angle = Math.random() * Math.PI * 2;
      // A mix of close and far lights gives the burst a soft, natural feeling.
      const distance = Math.pow(Math.random(), .55) * spread;
      dot.style.setProperty('--bokeh-x', `${Math.cos(angle) * distance}px`);
      dot.style.setProperty('--bokeh-y', `${Math.sin(angle) * distance * .74}px`);
      dot.style.setProperty('--bokeh-size', `${randomBetween(5, 24).toFixed(1)}px`);
      dot.style.setProperty('--bokeh-color', colors[Math.floor(Math.random() * colors.length)]);
      dot.style.setProperty('--bokeh-time', `${randomBetween(1.8, 3.8).toFixed(2)}s`);
      dot.style.setProperty('--bokeh-delay', `${randomBetween(0, .48).toFixed(2)}s`);
      fragment.appendChild(dot);
      setTimeout(() => dot.remove(), 4500);
    }
    bokehLayer.appendChild(fragment);
  }

  function typeLoveLetter() {
    const message = `Just like these flowers,\n\neven when life feels scattered,\n\ntogether\n\nwe create something beautiful.\n\nWe'll keep growing,\n\none little step at a time.\n\nI love you, Nawshin ❤️`;
    let character = 0;
    const speed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 26;
    const write = () => {
      letterText.textContent = message.slice(0, character);
      character += 1;
      if (character <= message.length) {
        setTimeout(write, speed);
      } else {
        letterCursor.classList.add('is-done');
      }
    };
    write();
  }

  function createPollen() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 34; i++) {
      const pollen = document.createElement('i');
      pollen.className = 'pollen';
      pollen.style.left = `${Math.random() * 100}%`;
      pollen.style.top = `${Math.random() * 100}%`;
      pollen.style.setProperty('--pollen-size', `${randomBetween(2, 5)}px`);
      pollen.style.setProperty('--pollen-x', `${randomBetween(-32, 34)}px`);
      pollen.style.setProperty('--pollen-y', `${randomBetween(-45, 20)}px`);
      pollen.style.setProperty('--pollen-time', `${randomBetween(4.5, 10).toFixed(2)}s`);
      pollen.style.setProperty('--pollen-delay', `${randomBetween(-8, 0).toFixed(2)}s`);
      fragment.appendChild(pollen);
    }
    pollenField.appendChild(fragment);
  }

  function handleResize() {
    if (activeDrag || gameLocked) return;
    // Preserve a collected bouquet; only lay out the scattered daisies when size changes.
    if (collectedCount === 0) {
      buildScatteredGarden();
    } else {
      flowers.forEach((flower, index) => {
        if (!flower.collected) return;
        const slot = collectionSlot(index < collectedCount ? flowers.filter(item => item.collected).indexOf(flower) : 0);
        flower.x = slot.x; flower.y = slot.y; placeFlower(flower, slot.x, slot.y);
      });
    }
  }

  function setupParallax() {
    window.addEventListener('pointermove', (event) => {
      pendingParallax.x = (event.clientX / window.innerWidth - .5) * 10;
      pendingParallax.y = (event.clientY / window.innerHeight - .5) * 10;
      if (parallaxFrame) return;
      parallaxFrame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--stage-x', `${pendingParallax.x}px`);
        document.documentElement.style.setProperty('--stage-y', `${pendingParallax.y}px`);
        parallaxFrame = 0;
      });
    }, { passive: true });
  }

  function randomBetween(min, max) { return min + Math.random() * (max - min); }
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

  function init() {
    buildGiantDaisy();
    createPollen();
    for (let i = 0; i < FLOWER_COUNT; i++) flowers.push(makeDaisy(i));
    requestAnimationFrame(buildScatteredGarden);
    window.addEventListener('resize', handleResize, { passive: true });
    setupParallax();

    messageContinue.addEventListener('click', () => showWelcomeScreen(1));
    playGameButton.addEventListener('click', beginGame);
  }

  init();
})();
