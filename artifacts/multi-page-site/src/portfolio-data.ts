import { PORTFOLIO_WORK_IDS } from "@workspace/site-content";

export const PRINT_CATEGORIES = ['laser', 'uv', 'dtf', 'business'] as const;
export const PORTFOLIO_MATERIALS = ['steel', 'metal', 'fabric', 'paper', 'ceramic', 'mixed'] as const;

export type PrintCategory = (typeof PRINT_CATEGORIES)[number];
export type PortfolioCategory = 'all' | PrintCategory;
export type PortfolioMaterial = (typeof PORTFOLIO_MATERIALS)[number];

export const PORTFOLIO_MATERIAL_OPTIONS: { id: 'all' | PortfolioMaterial; label: string }[] = [
  { id: 'all', label: 'Бүх материал' },
  { id: 'steel', label: 'Ган' },
  { id: 'metal', label: 'Металл' },
  { id: 'fabric', label: 'Даавуу' },
  { id: 'paper', label: 'Цаас' },
  { id: 'ceramic', label: 'Керамик' },
  { id: 'mixed', label: 'Холимог материал' },
];

export function getPortfolioMaterialFromSearch(search: string): 'all' | PortfolioMaterial {
  const material = new URLSearchParams(search).get('material');
  return PORTFOLIO_MATERIALS.find((knownMaterial) => knownMaterial === material) ?? 'all';
}

export function getPortfolioCategoryFromSearch(search: string): PortfolioCategory {
  const category = new URLSearchParams(search).get('category');
  return PRINT_CATEGORIES.find((printCategory) => printCategory === category) ?? 'all';
}

export function getPortfolioSearchTermFromSearch(search: string): string {
  return new URLSearchParams(search).get('search') ?? '';
}

export function getPortfolioWorkFromSearch(
  search: string,
  works: readonly PortfolioWorkItem[] = PORTFOLIO_WORK,
): PortfolioWorkItem | null {
  const image = new URLSearchParams(search).get('work');
  return works.find((item) => item.image === image || item.sourceImage === image || item.id === image) ?? null;
}

export function getPortfolioRouteCategoryFromSearch(
  search: string,
  works: readonly PortfolioWorkItem[] = PORTFOLIO_WORK,
): PortfolioCategory {
  const category = getPortfolioCategoryFromSearch(search);
  const work = getPortfolioWorkFromSearch(search, works);
  return work && category !== 'all' && category !== work.category ? work.category : category;
}

export const PORTFOLIO_CATEGORIES: { id: PortfolioCategory; label: string }[] = [
  { id: 'all', label: 'Бүгд' },
  { id: 'laser', label: 'Лазер' },
  { id: 'uv', label: 'UV' },
  { id: 'dtf', label: 'DTF' },
  { id: 'business', label: 'Бизнес хэвлэл' },
];

export const PORTFOLIO_SEARCH_SUGGESTIONS = [
  { label: 'Лазер сийлбэр', searchTerm: 'лазер сийлбэр', kind: 'Арга' },
  { label: 'UV хэвлэл', searchTerm: 'UV хэвлэл', kind: 'Арга' },
  { label: 'DTF хэвлэл', searchTerm: 'DTF хэвлэл', kind: 'Арга' },
  { label: 'Ган', searchTerm: 'ган', kind: 'Материал' },
  { label: 'Даавуун', searchTerm: 'даавуун', kind: 'Материал' },
  { label: 'Металл', searchTerm: 'металл', kind: 'Материал' },
] as const;

export type PortfolioWorkItem = {
  id: string;
  sourceImage: string;
  image: string;
  title: string;
  description: string;
  category: PrintCategory;
  materials: readonly PortfolioMaterial[];
};

const PORTFOLIO_WORK_SOURCE = [
  { image:'gallery_22.jpg', title:'Хайрцагтай дурсгалын зоос · Лазер сийлбэр', description:'Тусгай хайрцагтай дурсгалын зоосны лазер сийлбэрийн жишээ.', category:'laser' },
  { image:'gallery_23.jpg', title:'Дурсгалын медаль · Тусгай хайрцаг', description:'Бэлэглэхэд зориулсан хайрцагтай дурсгалын медаль.', category:'laser' },
  { image:'portfolio-medallion-03.webp', title:'Захиалгат дурсгалын зоос', description:'Захиалгаар хийсэн дурсгалын зоосны сийлбэр.', category:'laser' },
  { image:'gallery_39.jpg', title:'Зураг хэвлэх боломжтой ган зүүлт', description:'Хувийн зураг хэвлүүлж болох ган зүүлт.', category:'uv' },
  { image:'portfolio-pendant-01.webp', title:'Гэр бүлийн зурагтай ган зүүлт', description:'Гэр бүлийн зургаар хэвлэсэн дурсгалын зүүлт.', category:'uv' },
  { image:'portfolio-pendant-02.webp', title:'Захиалгат зурагт зүүлт · Дурсгалын бэлэг', description:'Зургаа хэвлүүлж захиалах боломжтой бэлгийн зүүлт.', category:'uv' },
  { image:'portfolio-tote.webp', title:'Даавуун тор дээрх захиалгат өнгөт хэвлэл', description:'Өнгөт зураг, загварыг даавуун тор дээр хэвлэсэн жишээ.', category:'dtf' },
  { image:'portfolio-badge-01.webp', title:'Металл тэмдэг, нэрийн хэвлэл', description:'Нэр болон дүрс хэвлэсэн металл тэмдэг.', category:'uv' },
  { image:'portfolio-badge-02.webp', title:'Лого хэвлэлтэй дугуй тэмдэг', description:'Байгууллагын лого бүхий дугуй тэмдэг.', category:'uv' },
  { image:'portfolio-badge-03.webp', title:'Зурагтай дурсгалын зүүлт', description:'Хувийн зурагтай захиалгат дурсгалын зүүлт.', category:'uv' },
  { image:'portfolio-badge-04.webp', title:'Өнгөт тэмдэг, түлхүүрийн оосор', description:'Өнгөт хэвлэлтэй тэмдэг болон түлхүүрийн оосор.', category:'uv' },
  { image:'portfolio-laser-01.webp', title:'Дэвтэр, үзэгний багц · Лазер сийлбэр', description:'Бичгийн хэрэгслийн багцад хийсэн лазер сийлбэр.', category:'laser' },
  { image:'portfolio-laser-02.webp', title:'Хайрцагтай үзэг · Лазер сийлбэр', description:'Бэлгийн хайрцагтай үзгэн дээрх лазер сийлбэр.', category:'laser' },
  { image:'portfolio-laser-03.webp', title:'Термос саван дээрх лазер сийлбэр', description:'Өдөр тутам авч явах термос саванд лазераар сийлсэн жишээ.', category:'laser' },
  { image:'portfolio-laser-04.webp', title:'Жижиг металл эдлэл · Лазер сийлбэр', description:'Жижиг металл эдлэл дээр хийсэн нарийн сийлбэр.', category:'laser' },
  { image:'portfolio-laser-05.webp', title:'Ган аяган дээрх лого · Лазер сийлбэр', description:'Ган аяган дээр байгууллагын лого сийлсэн жишээ.', category:'laser' },
  { image:'portfolio-laser-06.webp', title:'Медаль, түлхүүрийн оосрын жишээнүүд', description:'Медаль болон түлхүүрийн оосрын лазер сийлбэр.', category:'laser' },
  { image:'portfolio-laser-overview.webp', title:'Лазер сийлбэрийн ажлын жишээнүүд', description:'Төрөл бүрийн бүтээгдэхүүн дээрх лазер сийлбэрийн жишээ.', category:'laser' },
  { image:'portfolio-uv-01.webp', title:'Лого хэвлэлтэй аяга · UV хэвлэл', description:'Аяган дээр UV аргаар хэвлэсэн лого.', category:'uv' },
  { image:'portfolio-uv-02.webp', title:'Дэвтэр, үзэгний багц · UV хэвлэл', description:'Дэвтэр, үзэг зэрэг бичгийн хэрэгслийн багц дээрх UV хэвлэл.', category:'uv' },
  { image:'portfolio-uv-03.webp', title:'Термос саван дээрх өнгөт UV хэвлэл', description:'Термос саван дээр өнгөт загвар хэвлэсэн жишээ.', category:'uv' },
  { image:'portfolio-uv-04.webp', title:'UV хэвлэлийн ажлын явц', description:'Бүтээгдэхүүн дээр UV хэвлэл хийх ажлын үе шат.', category:'uv' },
  { image:'portfolio-uv-overview.webp', title:'Бүтээгдэхүүн дээрх UV хэвлэлийн жишээнүүд', description:'Янз бүрийн бүтээгдэхүүн дээрх өнгөт UV хэвлэл.', category:'uv' },
  { image:'portfolio-dtf-samples.webp', title:'DTF хэвлэлийн бүтээгдэхүүний жишээнүүд', description:'DTF хэвлэлээр загвар оруулсан бүтээгдэхүүний дээжүүд.', category:'dtf' },
  { image:'portfolio-dtf-overview.webp', title:'DTF хэвлэлтэй бүтээгдэхүүний үзүүлэн', description:'DTF хэвлэлтэй бүтээгдэхүүний сонголтуудыг харуулсан үзүүлэн.', category:'dtf' },
  { image:'portfolio-business-card.webp', title:'Нэрийн хуудасны захиалгат хэвлэл', description:'Загвар, брэндийн өнгөөр хэвлэсэн захиалгат нэрийн хуудас.', category:'business' },
  { image:'portfolio-business-gifts.webp', title:'Бизнес бэлгийн багц, бичгийн хэрэгсэл', description:'Бизнесийн бэлэг болон брэндийн бичгийн хэрэгслийн багц.', category:'business' },
  { image:'portfolio-business-overview.webp', title:'Брэндийн бүтээгдэхүүний хэвлэлийн дээж', description:'Байгууллагын брэндийг бүтээгдэхүүн дээр хэвлэсэн жишээнүүд.', category:'business' },
  { image:'portfolio-khaan-buuz-cups-01.webp', title:'KHAAN BUUZ аяганы нэр, дүрсний лазер сийлбэр', description:'Байгууллагын лого, нэр болон захиалгат дүрсийг термо аяга бүрт тохируулан сийлсэн жишээ.', category:'laser' },
  { image:'portfolio-khaan-buuz-cups-02.webp', title:'KHAAN BUUZ термо аяганы цуврал сийлбэр', description:'Өөр өөр нэр, дүрс бүхий захиалгат термо аяганы цуврал.', category:'laser' },
  { image:'portfolio-profession-notebooks.webp', title:'Мэргэжлийн дүрстэй дэвтрийн захиалгат хэвлэл', description:'Кино, анагаах ухаан, криминалистикийн чиглэлийн дүрс, бичвэрийг дэвтрийн хавтас дээр хэвлэсэн жишээ.', category:'uv' },
  { image:'portfolio-lamo-keychain-pen.webp', title:'Los Angeles Mongolian Community · түлхүүрийн оосор, үзэг', description:'Байгууллагын лого болон 2006–2026 ойн тэмдэглэлийг металл түлхүүрийн оосор, үзэг дээр лазераар сийлсэн.', category:'laser' },
  { image:'portfolio-sejong-notebook-set.webp', title:'King Sejong Institute · дэвтэр, үзэгний бэлгийн багц', description:'King Sejong Institute Ulaanbaatar 1-ийн нэр, лого бүхий дэвтэр, үзэгний багц.', category:'business' },
  { image:'portfolio-custom-notebook-pen-set.webp', title:'Монгол бичигтэй дэвтэр, үзэгний багц', description:'Байгууллагын тэмдэг, монгол бичгээр чимэглэсэн хөх дэвтэр, үзэгний бэлгийн багц.', category:'business' },
  { image:'portfolio-enkh-amgalan-notebooks.webp', title:'Энх Амгалан ӨЭМТ · 10 жилийн ойн дэвтэр', description:'ХУД-ийн 14-р хорооны Энх Амгалан ӨЭМТ-ийн 10 жилийн ойд зориулсан захиалгат дэвтэр.', category:'business' },
  { image:'portfolio-itgeh-med-gift-set.webp', title:'Итгэх Мед эмнэлгийн брэнд бэлгийн багц', description:'Эмнэлгийн нэр, логотой аяга, даавуун тор, дэвтэр, үзэг бүхий байгууллагын бэлгийн багц.', category:'business' },
  { image:'portfolio-mongol-express-notebook.webp', title:'Mongol Express · захиалгат дэвтрийн хэвлэл', description:'Mongol Express-ийн лого, холбоо барих мэдээлэл, QR кодтой шар дэвтэр.', category:'business' },
  { image:'portfolio-heritage-mongolia-badges.webp', title:'Heritage Mongolia · түүхэн дүрст тэмдэг', description:'Монголын түүхэн дүрслэл, өнгөт зураг бүхий дугуй тэмдгийн хэвлэл.', category:'uv' },
  { image:'portfolio-custom-message-thermos-cups.webp', title:'Урам өгсөн бичвэртэй термо аяга', description:'Монгол хэл дээрх захиалгат үг, бичвэрийг олон өнгийн термо аяганд хэвлэсэн жишээ.', category:'uv' },
  { image:'portfolio-ecm-branded-card.webp', title:'ECM Group · алтлаг логотой нэрийн карт', description:'ECM Group-ийн лого, нэрийг хар картан дээр алтлаг өнгөөр хэвлэсэн жишээ.', category:'business' },
  { image:'portfolio-award-medals-collection.webp', title:'Хайрцагтай алтан медалийн цуврал', description:'Алтан өнгөлгөөтэй захиалгат медаль, гэрчилгээ, улаан хайрцагтай багцын жишээ.', category:'laser' },
  { image:'portfolio-logo-thermos-series.webp', title:'Лого сийлбэртэй термо савны цуврал', description:'Хар болон цэнхэр термо саванд байгууллагын лого сийлсэн цуврал жишээ.', category:'laser' },
  { image:'portfolio-award-medals-closeup.webp', title:'Алтан медаль, гэрчилгээний хайрцаг', description:'Байгууллагын тэмдэг, захиалгат бичвэртэй медаль болон гэрчилгээний иж бүрдэл.', category:'laser' },
  { image:'portfolio-award-medal-detail.webp', title:'Захиалгат алтан медалийн нарийн хийц', description:'Байгууллагын нэр, тэмдэг бүхий алтан өнгийн медалийн ойрын зураг.', category:'laser' },
  { image:'portfolio-otgontenger-medal-set.webp', title:'Отгонтэнгэр хайрханы дурсгалын медаль', description:'Уулын дүрст медаль болон тахилгын бичвэртэй, хайрцагтай дурсгалын багц.', category:'laser' },
  { image:'portfolio-otgontenger-medal-inscription.webp', title:'Төрийн их тахилгын медалийн бичвэр', description:'Отгонтэнгэр хайрханы 2026 оны төрийн их тахилгад зориулсан медалийн бичвэр, хайрцаг.', category:'laser' },
  { image:'portfolio-otgontenger-medal-artwork.webp', title:'Хангайн нурууны дүрст медаль', description:'Хангайн нуруу, Отгонтэнгэр хайрханы дүрслэлтэй дурсгалын медалийн нүүр тал.', category:'laser' },
] satisfies Omit<PortfolioWorkItem, 'id' | 'sourceImage' | 'materials'>[];

const MATERIALS_BY_IMAGE: Record<string, readonly PortfolioMaterial[]> = {
  'gallery_22.jpg': ['metal'],
  'gallery_23.jpg': ['metal'],
  'portfolio-medallion-03.webp': ['metal'],
  'gallery_39.jpg': ['steel'],
  'portfolio-pendant-01.webp': ['steel'],
  'portfolio-pendant-02.webp': ['metal'],
  'portfolio-tote.webp': ['fabric'],
  'portfolio-badge-01.webp': ['metal'],
  'portfolio-badge-02.webp': ['metal'],
  'portfolio-badge-03.webp': ['metal'],
  'portfolio-badge-04.webp': ['metal'],
  'portfolio-laser-01.webp': ['mixed'],
  'portfolio-laser-02.webp': ['mixed'],
  'portfolio-laser-03.webp': ['steel'],
  'portfolio-laser-04.webp': ['metal'],
  'portfolio-laser-05.webp': ['steel'],
  'portfolio-laser-06.webp': ['metal'],
  'portfolio-laser-overview.webp': ['mixed'],
  'portfolio-uv-01.webp': ['ceramic'],
  'portfolio-uv-02.webp': ['mixed'],
  'portfolio-uv-03.webp': ['steel'],
  'portfolio-uv-04.webp': ['mixed'],
  'portfolio-uv-overview.webp': ['mixed'],
  'portfolio-dtf-samples.webp': ['fabric'],
  'portfolio-dtf-overview.webp': ['fabric'],
  'portfolio-business-card.webp': ['paper'],
  'portfolio-business-gifts.webp': ['mixed'],
  'portfolio-business-overview.webp': ['mixed'],
  'portfolio-khaan-buuz-cups-01.webp': ['steel'],
  'portfolio-khaan-buuz-cups-02.webp': ['steel'],
  'portfolio-profession-notebooks.webp': ['paper'],
  'portfolio-lamo-keychain-pen.webp': ['metal'],
  'portfolio-sejong-notebook-set.webp': ['mixed'],
  'portfolio-custom-notebook-pen-set.webp': ['mixed'],
  'portfolio-enkh-amgalan-notebooks.webp': ['paper'],
  'portfolio-itgeh-med-gift-set.webp': ['mixed'],
  'portfolio-mongol-express-notebook.webp': ['paper'],
  'portfolio-heritage-mongolia-badges.webp': ['metal'],
  'portfolio-custom-message-thermos-cups.webp': ['steel'],
  'portfolio-ecm-branded-card.webp': ['paper'],
  'portfolio-award-medals-collection.webp': ['metal'],
  'portfolio-logo-thermos-series.webp': ['steel'],
  'portfolio-award-medals-closeup.webp': ['metal'],
  'portfolio-award-medal-detail.webp': ['metal'],
  'portfolio-otgontenger-medal-set.webp': ['metal'],
  'portfolio-otgontenger-medal-inscription.webp': ['metal'],
  'portfolio-otgontenger-medal-artwork.webp': ['metal'],
};

if (PORTFOLIO_WORK_SOURCE.length !== PORTFOLIO_WORK_IDS.length) {
  throw new Error('Portfolio work IDs must stay aligned with the append-only source list.');
}

export const PORTFOLIO_WORK: PortfolioWorkItem[] = PORTFOLIO_WORK_SOURCE.map((item, index) => {
  const materials = MATERIALS_BY_IMAGE[item.image];
  if (!materials?.length) throw new Error(`Missing material tags for portfolio example: ${item.image}`);
  return { ...item, id: PORTFOLIO_WORK_IDS[index], sourceImage: item.image, materials };
});

export type PortfolioWorkOverride = Pick<
  PortfolioWorkItem,
  'id' | 'image' | 'title' | 'description' | 'category'
>;

export function mergePortfolioWork(
  initial: readonly PortfolioWorkItem[],
  changes: readonly PortfolioWorkOverride[],
): PortfolioWorkItem[] {
  const changesById = new Map(changes.map((change) => [change.id, change]));
  return initial.map((item) => ({ ...item, ...changesById.get(item.id) }));
}

const CATEGORY_SEARCH_ALIASES: Partial<Record<PrintCategory, readonly string[]>> = {
  laser: ['laser engraving', 'laser etching', 'engraving', 'гравировка', 'гравировка лазером'],
  uv: ['uv print', 'uv printing', 'ultraviolet', 'ultraviolet printing', 'уф хэвлэл', 'ультрафиолетовая печать'],
  dtf: ['direct to film', 'direct-to-film', 'heat transfer', 'iron-on transfer', 'термотрансфер'],
};

const ITEM_SEARCH_ALIASES: Record<string, readonly string[]> = {
  'gallery_22.jpg': ['coin', 'medallion'],
  'gallery_23.jpg': ['medal', 'medallion'],
  'portfolio-medallion-03.webp': ['coin', 'medal'],
  'gallery_39.jpg': ['steel', 'stainless steel', 'stainless', 'pendant'],
  'portfolio-pendant-01.webp': ['steel', 'stainless steel', 'stainless', 'pendant'],
  'portfolio-pendant-02.webp': ['pendant'],
  'portfolio-tote.webp': ['fabric', 'textile', 'cloth', 'cotton', 'tote bag'],
  'portfolio-badge-01.webp': ['metal', 'metallic', 'badge', 'pin'],
  'portfolio-badge-02.webp': ['badge', 'pin'],
  'portfolio-badge-03.webp': ['pendant'],
  'portfolio-badge-04.webp': ['metal', 'metallic', 'badge', 'keychain'],
  'portfolio-laser-04.webp': ['metal', 'metallic'],
  'portfolio-laser-05.webp': ['steel', 'stainless steel', 'stainless', 'mug', 'cup'],
  'portfolio-uv-01.webp': ['mug', 'cup'],
  'portfolio-khaan-buuz-cups-01.webp': ['khaan buuz', 'thermos', 'thermo cup', 'travel mug', 'cup'],
  'portfolio-khaan-buuz-cups-02.webp': ['khaan buuz', 'thermos', 'thermo cup', 'travel mug', 'cup'],
  'portfolio-profession-notebooks.webp': ['notebook', 'journal', 'custom notebook'],
  'portfolio-lamo-keychain-pen.webp': ['keychain', 'key ring', 'keyring', 'pen', 'anniversary'],
  'portfolio-sejong-notebook-set.webp': ['king sejong', 'sejong institute', 'notebook', 'journal', 'pen', 'gift set'],
  'portfolio-custom-notebook-pen-set.webp': ['notebook', 'journal', 'pen', 'gift set', 'mongolian script'],
  'portfolio-enkh-amgalan-notebooks.webp': ['notebook', 'journal', 'anniversary', 'health center'],
  'portfolio-itgeh-med-gift-set.webp': ['medical', 'clinic', 'tumbler', 'mug', 'tote', 'notebook', 'pen', 'gift set'],
  'portfolio-mongol-express-notebook.webp': ['mongol express', 'notebook', 'journal', 'qr code'],
  'portfolio-heritage-mongolia-badges.webp': ['heritage mongolia', 'badge', 'pin', 'button badge'],
  'portfolio-custom-message-thermos-cups.webp': ['thermos', 'thermo cup', 'travel mug', 'tumbler', 'cup', 'quote'],
  'portfolio-ecm-branded-card.webp': ['ecm group', 'branded card', 'business card', 'logo card'],
  'portfolio-award-medals-collection.webp': ['medal', 'medallion', 'coin', 'award', 'certificate', 'gift box'],
  'portfolio-logo-thermos-series.webp': ['thermos', 'water bottle', 'vacuum flask', 'bottle', 'logo'],
  'portfolio-award-medals-closeup.webp': ['medal', 'medallion', 'award', 'certificate', 'gift box'],
  'portfolio-award-medal-detail.webp': ['medal', 'medallion', 'award', 'school medal'],
  'portfolio-otgontenger-medal-set.webp': ['otgontenger', 'medal', 'medallion', 'coin', 'gift box'],
  'portfolio-otgontenger-medal-inscription.webp': ['otgontenger', 'medal', 'medallion', 'inscription', '2026'],
  'portfolio-otgontenger-medal-artwork.webp': ['otgontenger', 'khangai', 'medal', 'medallion', 'coin'],
};

export function filterPortfolioWork(
  category: PortfolioCategory,
  searchTerm = '',
  material: 'all' | PortfolioMaterial = 'all',
  works: readonly PortfolioWorkItem[] = PORTFOLIO_WORK,
): PortfolioWorkItem[] {
  const categoryWork = category === 'all'
    ? [...works]
    : works.filter((item) => item.category === category);
  const materialWork = material === 'all'
    ? categoryWork
    : categoryWork.filter((item) => item.materials.includes(material)
      || (material === 'metal' && item.materials.includes('steel')));
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const searchWords = normalizedSearchTerm.split(/\s+/);

  return normalizedSearchTerm
    ? materialWork.filter((item) => {
      const searchableText = [
        item.title,
        item.description,
        ...(CATEGORY_SEARCH_ALIASES[item.category] ?? []),
        ...(ITEM_SEARCH_ALIASES[item.sourceImage] ?? []),
      ].join(' ').toLocaleLowerCase();

      return searchWords.every((word) => searchableText.includes(word));
    })
    : materialWork;
}
