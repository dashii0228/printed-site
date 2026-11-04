import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHomeHeroSlides } from './home-hero.ts';

test('homepage images alternate between products and portfolio work', () => {
  const slides = buildHomeHeroSlides(
    [{ id: 'mug', image: 'mug.webp', name: 'Аяга' }, { id: 'bag', image: 'bag.webp', name: 'Тор' }],
    [{ id: 'medal', image: 'medal.webp', title: 'Медаль' }, { id: 'notebook', image: 'notebook.webp', title: 'Дэвтэр' }],
  );

  assert.deepEqual(slides.map(({ kind, image }) => [kind, image]), [
    ['product', 'mug.webp'],
    ['portfolio', 'medal.webp'],
    ['product', 'bag.webp'],
    ['portfolio', 'notebook.webp'],
  ]);
});

test('product gallery photos are included and repeated image paths are shown once', () => {
  const slides = buildHomeHeroSlides(
    [{
      id: 'tote',
      image: 'tote.webp',
      name: 'Даавуун тор',
      additionalImages: [{ image: 'printed-tote.webp', label: 'Хэвлэсэн жишээ' }],
    }],
    [
      { id: 'tote-work', image: 'printed-tote.webp', title: 'Торны хэвлэл' },
      { id: 'medal', image: 'medal.webp', title: 'Медаль' },
    ],
  );

  assert.deepEqual(slides.map(({ image }) => image), ['tote.webp', 'printed-tote.webp', 'medal.webp']);
  assert.equal(slides[1].kind, 'portfolio');
  assert.equal(slides[1].alt, 'Торны хэвлэл');
});

test('homepage slideshow remains useful when only one image source is available', () => {
  assert.deepEqual(
    buildHomeHeroSlides([], [{ image: 'work.webp', title: 'Бүтээл' }]).map(({ kind }) => kind),
    ['portfolio'],
  );
  assert.deepEqual(
    buildHomeHeroSlides([{ image: 'product.webp', name: 'Бүтээгдэхүүн' }], []).map(({ kind }) => kind),
    ['product'],
  );
});
