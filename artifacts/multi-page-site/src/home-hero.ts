export type HomeHeroSlide = {
  key: string;
  image: string;
  alt: string;
  title: string;
  kind: 'product' | 'portfolio';
};

type HomeHeroProduct = {
  id?: string;
  image: string;
  name: string;
  additionalImages?: { image: string; label: string }[];
};

type HomeHeroPortfolioWork = {
  id?: string;
  image: string;
  title: string;
};

export function buildHomeHeroSlides(
  products: readonly HomeHeroProduct[],
  works: readonly HomeHeroPortfolioWork[],
): HomeHeroSlide[] {
  const productSlides = products.flatMap((product) => {
    const productId = product.id ?? product.image;
    return [
      {
        key: `product:${productId}:${product.image}`,
        image: product.image,
        alt: product.name,
        title: product.name,
        kind: 'product' as const,
      },
      ...(product.additionalImages ?? []).map((additionalImage) => ({
        key: `product:${productId}:${additionalImage.image}`,
        image: additionalImage.image,
        alt: `${product.name} — ${additionalImage.label}`,
        title: `${product.name} — ${additionalImage.label}`,
        kind: 'product' as const,
      })),
    ];
  });
  const portfolioSlides = works.map((work) => ({
    key: `portfolio:${work.id ?? work.image}`,
    image: work.image,
    alt: work.title,
    title: work.title,
    kind: 'portfolio' as const,
  }));

  const slides: HomeHeroSlide[] = [];
  const seenImages = new Set<string>();
  const count = Math.max(productSlides.length, portfolioSlides.length);
  for (let index = 0; index < count; index += 1) {
    for (const slide of [productSlides[index], portfolioSlides[index]]) {
      if (!slide || seenImages.has(slide.image)) continue;
      seenImages.add(slide.image);
      slides.push(slide);
    }
  }
  return slides;
}
