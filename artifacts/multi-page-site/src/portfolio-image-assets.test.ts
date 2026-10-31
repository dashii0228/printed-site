import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PORTFOLIO_WORK } from './portfolio-data.ts';

const publicImagesDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/images',
);
const supportedImageFormats = new Set(['jpeg', 'webp']);

test('every portfolio image exists as a file in public/images', () => {
  const invalidImages = PORTFOLIO_WORK.flatMap(({ image }) => {
    const imagePath = resolve(publicImagesDirectory, image);
    const isInsidePublicImages = imagePath.startsWith(`${publicImagesDirectory}${sep}`);

    if (!isInsidePublicImages) {
      return [`${image} (outside public/images)`];
    }

    try {
      return statSync(imagePath).isFile() ? [] : [`${image} (not a file)`];
    } catch {
      return [image];
    }
  });

  assert.deepEqual(invalidImages, [], `Invalid portfolio image files: ${invalidImages.join(', ')}`);
});

test('every portfolio image is a supported, readable image', async () => {
  const unreadableImages: string[] = [];

  for (const { image } of PORTFOLIO_WORK) {
    const imagePath = resolve(publicImagesDirectory, image);
    const isInsidePublicImages = imagePath.startsWith(`${publicImagesDirectory}${sep}`);

    if (!isInsidePublicImages) {
      unreadableImages.push(`${image} (outside public/images)`);
      continue;
    }

    try {
      const { format } = await sharp(imagePath).metadata();

      if (!format || !supportedImageFormats.has(format)) {
        unreadableImages.push(`${image} (unsupported format: ${format ?? 'unknown'})`);
        continue;
      }

      await sharp(imagePath).stats();
    } catch {
      unreadableImages.push(`${image} (cannot be decoded)`);
    }
  }

  assert.deepEqual(
    unreadableImages,
    [],
    `Unreadable portfolio image files: ${unreadableImages.join(', ')}`,
  );
});
