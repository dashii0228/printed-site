import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { filterDeletedEntries, loadCatalogDeletions } from './catalog-deletions';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, ChevronLeft, ChevronRight, Clock3, FileText, MapPin, Menu, MessageCircle, Package, Phone, Printer, Scissors, Settings2, ShieldCheck, Sparkles, X, Check, Copy, Search, Share2 } from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { AdminPage, SignInPage, SignUpPage } from './components/auth-pages';
import { filterPortfolioWork, getPortfolioCategoryFromSearch, getPortfolioMaterialFromSearch, getPortfolioRouteCategoryFromSearch, getPortfolioSearchTermFromSearch, getPortfolioWorkFromSearch, mergePortfolioWork, PORTFOLIO_CATEGORIES, PORTFOLIO_MATERIAL_OPTIONS, PORTFOLIO_SEARCH_SUGGESTIONS, PORTFOLIO_WORK, type PortfolioWorkOverride } from './portfolio-data';
import { getImageUrl } from './image-url';
import { useAdminFetch } from './use-admin-fetch';
import { buildHomeHeroSlides, type HomeHeroSlide } from './home-hero';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const img = (name: string) => getImageUrl(name, import.meta.env.BASE_URL);
const topBannerPromotion = 'Та манайхаас промошн болон корпорейт бэлгээ сонгоод хэвлэлийг нь үнэгүй хийлгэж аваарай';
const navItems = [
  ['/', 'Нүүр'], ['/services', 'Үйлчилгээ'], ['/products', 'Бүтээгдэхүүн'],
  ['/equipment-sale', 'Тоног төхөөрөмж'], ['/portfolio', 'Бүтээлийн сан'],
  ['/process', 'Үйл явц'], ['/contact', 'Холбоо барих'],
];
const pageMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Хэвлэлийн үйлчилгээ, лазер сийлбэр | Printed',
    description: 'Лазер, UV, DTF болон бизнес хэвлэлээр санаагаа бодит бүтээгдэхүүн болгоорой. Үйлчилгээ, бүтээгдэхүүн, ажлын жишээ болон холбоо барих мэдээллийг үзнэ үү.',
  },
  '/services': {
    title: 'Лазер, UV, DTF хэвлэлийн үйлчилгээ | Printed',
    description: 'Лазер сийлбэр, UV, DTF болон цаасан хэвлэлийн сонголтуудтай танилцаж, төсөлдөө тохирох шийдлийг асуугаарай.',
  },
  '/products': {
    title: 'Захиалгат хэвлэлийн бүтээгдэхүүн, бэлэг | Printed',
    description: 'Термос, аяга, дэвтэр, бэлгийн сет болон бусад бүтээгдэхүүнд лого, загвараа хэвлүүлэх боломжуудыг үзээрэй.',
  },
  '/equipment-sale': {
    title: 'Хэвлэлийн тоног төхөөрөмжийн мэдээлэл | Printed',
    description: 'Лазер сийлбэр, UV болон дижитал хэвлэлийн тоног төхөөрөмжийн сонголт, хэрэглээний талаар зөвлөгөө аваарай.',
  },
  '/portfolio': {
    title: 'Хэвлэл, сийлбэрийн ажлын жишээ | Printed',
    description: 'Лазер сийлбэр, UV, DTF болон бизнес хэвлэлийн хийсэн ажлуудын жишээг нэг дороос үзээрэй.',
  },
  '/process': {
    title: 'Хэвлэлийн захиалгын үйл явц | Printed',
    description: 'Холбоо барих, дизайнаа тохирох, үйлдвэрлэл болон бэлэн бүтээгдэхүүнээ хүлээн авах үе шатуудтай танилцана уу.',
  },
  '/contact': {
    title: 'Холбоо барих, хэвлэлийн захиалга | Printed',
    description: 'Хэвлэлийн үйлчилгээ, захиалгат бүтээгдэхүүний талаар Printed-тэй холбогдоорой. Утас, хаяг болон Facebook мэдээлэл энд байна.',
  },
  '/admin': {
    title: 'Админ хэсэг | Printed',
    description: 'Printed сайтын админ эрхийн баталгаажуулалт.',
  },
  notFound: {
    title: 'Хуудас олдсонгүй | Printed',
    description: 'Таны хайсан хуудас олдсонгүй. Printed сайтын нүүр хуудас руу буцаж, үйлчилгээ болон бүтээгдэхүүнийг үзнэ үү.',
  },
};

function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return <>
    <div className="topline">
      <div className="topline-inner">
        <span>UB · МОНГОЛ УЛС</span>
        <div className="topline-marquee" role="note" aria-label={topBannerPromotion}>
          <div className="topline-marquee-track" aria-hidden="true">
            <span>{topBannerPromotion}</span>
            <span>{topBannerPromotion}</span>
          </div>
        </div>
        <span>Хэвлэл бүрд сэтгэл шингээнэ</span>
      </div>
    </div>
    <header className="header">
      <div className="nav-wrap">
        <Link href="/" className="brand" onClick={() => setOpen(false)} aria-label="Printed нүүр хуудас"><img src={img('header-logo.png')} alt="Printed — All printing, custom gifts" /></Link>
        <button className="mobile-toggle" aria-label={open ? 'Цэс хаах' : 'Цэс нээх'} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-mobile-menu">{open ? <X size={22}/> : <Menu size={22}/>}</button>
        <nav className={`nav-links ${open ? 'menu-open' : ''}`} aria-label="Үндсэн цэс">
          {navItems.map(([href, label]) => <Link key={href} href={href} aria-current={location === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
          <AccountNavigation onNavigate={() => setOpen(false)} />
          <a className="nav-call" href="tel:85882030" onClick={() => setOpen(false)}>8588 2030</a>
        </nav>
      </div>
    </header>
  </>;
}
function AccountNavigation({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const adminFetch = useAdminFetch();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    adminFetch('/api/admin/access')
      .then((response) => { if (active) setIsAdmin(response.ok); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, user?.id, adminFetch]);

  if (!isLoaded || !isSignedIn) return null;

  return <div className="nav-auth-links">
    {isAdmin && <Link href="/admin" onClick={onNavigate}>Админ хэсэг</Link>}
    <button type="button" onClick={() => { onNavigate(); void signOut({ redirectUrl: basePath || '/' }); }}>Гарах</button>
  </div>;
}
function Footer() {
  return <footer className="footer"><div className="footer-inner">
    <div><img className="footer-logo" src={img('footer-logo.png')} alt="Printed" /><p>Санааг бодит бүтээгдэхүүн болгоно.<br/>Лазер, UV, DTF болон бизнес хэвлэл.</p></div>
    <div><h3>Хуудас</h3><div className="footer-links">{navItems.slice(1).map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</div></div>
    <div><h3>Холбоо барих</h3><p><a href="tel:85882030">8588 2030</a><br/><a href="tel:86681144">8668 1144</a><br/>БЗД, 16-р хороолол</p><a href="https://www.facebook.com/profile.php?id=100063665375091" target="_blank" rel="noopener noreferrer">Facebook хуудас</a></div>
  </div><div className="copyright"><span>© Printed · All printing • Custom gifts</span><span>Улаанбаатар, Монгол</span></div></footer>;
}
function Shell({ children }: { children: ReactNode }) {
  return <div className="site-shell"><Header/><main>{children}</main><Footer/></div>;
}
function Eyebrow({ children }: { children: ReactNode }) { return <div className="eyebrow">{children}</div>; }
function SectionLabel({ children }: { children: ReactNode }) { return <div className="label">{children}</div>; }
function ButtonLink({ href, children, outline=false }: { href: string; children: ReactNode; outline?: boolean }) {
  return <Link href={href} className={`button ${outline ? 'button-outline' : 'button-red'}`}>{children}<ArrowRight size={16}/></Link>;
}

const services = [
  { icon:Printer, n:'01', title:'UV хэвлэл', desc:'Хавтгай болон цилиндр гадаргууд шууд хэвлэж, өнгөлөг дүрсийг тогтооно.', href:'/services#uv' },
  { icon:Scissors, n:'02', title:'Лазер сийлбэр, зүсэлт', desc:'Мод, металл, арьс болон бусад материал дээр нарийн сийлбэр хийнэ.', href:'/services#laser' },
  { icon:Sparkles, n:'03', title:'DTF хэвлэл', desc:'Даавуун бүтээгдэхүүнд зориулсан тод, удаан эдэлгээтэй хэвлэл.', href:'/services#dtf' },
  { icon:FileText, n:'04', title:'Цаасан хэвлэл', desc:'Нэрийн хуудас, брошюр, каталог болон байгууллагын хэвлэл.', href:'/services#paper' },
  { icon:BriefcaseBusiness, n:'05', title:'Бизнес хэвлэл', desc:'Брэндийн өдөр тутмын хэрэглээний материал, байгууллагын хэрэгсэл.', href:'/products' },
  { icon:BadgeCheck, n:'06', title:'Захиалгат бэлэг', desc:'Таны лого, санаагаар бүтээсэн дурсгалын болон промошн бүтээгдэхүүн.', href:'/products' },
];
type ProductCategory = 'Термо сав ба аяга' | 'Дэвтэр ба үзэг' | 'Сет' | 'Тэмдэг, медаль' | 'Түлхүүрийн оосор' | 'Зүүлт' | 'Карт холдер' | 'Үнэмлэх' | 'Даавуун тор' | 'Цаасан уут' | 'Бусад';
const productCategoryOrder: ProductCategory[] = [
  'Термо сав ба аяга',
  'Дэвтэр ба үзэг',
  'Сет',
  'Тэмдэг, медаль',
  'Түлхүүрийн оосор',
  'Зүүлт',
  'Карт холдер',
  'Үнэмлэх',
  'Даавуун тор',
  'Цаасан уут',
  'Бусад',
];
function getProductCategoryFromSearch(search: string): ProductCategory | 'all' {
  const category = new URLSearchParams(search).get('category');
  return productCategoryOrder.find((candidate) => candidate === category) ?? 'all';
}
type ProductSpec = { label: string; value: string };
type Product = {
  id?: string;
  sortOrder?: number;
  image: string;
  imageLabel?: string;
  additionalImages?: { image: string; label: string }[];
  name: string;
  category: ProductCategory;
  desc: string;
  details: string;
  specs: ProductSpec[];
  features: string[];
};
const products: Product[] = [
  {
    image:'ceramic_mug.png', category:'Термо сав ба аяга', name:'Захиалгат шаазан аяга',
    desc:'Цагаан шаазан аяга дээр лого, дизайн, зураг, нэрийг бүрэн өнгөт сублимац хэвлэлээр тодоор гаргана.',
    details:'Цагаан шаазан аяга дээр таны лого, дизайн, зураг, нэрийг бүрэн өнгөт сублимац хэвлэлээр тодоор гаргана. Бэлэг болгоход хамгийн тохиромжтой.',
    specs:[{label:'Багтаамж',value:'330мл (11oz)'},{label:'Материал',value:'Шаазан'},{label:'Хэвлэлт',value:'Бүрэн өнгөт сублимац'},{label:'Арчилгаа',value:'Угаалгын машинд тэсвэртэй'}],
    features:['Лого, нэр, дизайн, зураг хэвлэх боломжтой','Кофе, цай болон бусад ундаанд тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'japan_design.png', category:'Термо сав ба аяга', name:'Япон загварын термо сав',
    desc:'Vacuum insulated технологитой, 360° стрессгүй уух тав тухтай хийцтэй.',
    details:'Vacuum insulated технологитой Япон дизайнтай термо сав. 360° stress-free ундааны тав тухтай хийцтэй, гадуур авч явахад тохиромжтой.',
    specs:[{label:'Технологи',value:'Vacuum insulated'},{label:'Дизайн',value:'360° stress-free'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Халуун, хүйтнээ удаан барина','360° уух боломжтой тагтай','Гадуур авч явахад тэсвэртэй, бат бөх бүтэц','Лазер хэвлэлээр лого, нэр бичих боломжтой'],
  },
  {
    image:'badge.png', category:'Тэмдэг, медаль', name:'Энгэрийн тэмдэг (Badge)',
    desc:'Металл суурьтай дугуй тэмдэгт лого, загвараар бүрэн өнгөт хэвлэл хийнэ.',
    details:'Дугуй хэлбэртэй металл суурьтай энгэрийн тэмдэг. Таны лого, загвараар бүрэн өнгөт хэвлэлтэй; байгууллагын арга хэмжээ, үзэсгэлэн, сурталчилгаанд тохиромжтой.',
    specs:[{label:'Хэлбэр',value:'Дугуй'},{label:'Материал',value:'Металл суурь, хуванцар бүрхүүл'},{label:'Хэвлэлт',value:'Бүрэн өнгөт'},{label:'Тогтоогч',value:'Зүү хавчаар'}],
    features:['Таны лого, загвараар захиалгаар хийнэ','Цөөн болон олон тоогоор захиалах боломжтой'],
  },
  {
    image:'leather-card-holder.png', category:'Карт холдер', name:'Арьсан гадартай карт холдер',
    desc:'Металл хавчаартай визитний карт холдерт брэнд нэр, лого лазераар сийлнэ.',
    details:'Арьсан гадартай, металл хавчаартай визитний карт холдер. Лазер хэвлэлээр брэнд нэр, лого бичих боломжтой бөгөөд байгууллагын бэлэгт тохиромжтой.',
    specs:[{label:'Материал',value:'Арьс, металл'},{label:'Өнгө',value:'Хар'},{label:'Хэвлэлт',value:'Лазер'}],
    features:['Визит карт хадгалахад тохиромжтой','Лазер хэвлэлээр лого, нэр бичих боломжтой'],
  },
  {
    image:'Tote-bag.png', category:'Даавуун тор', name:'Даавуун тор',
    additionalImages:[{image:'tote-bag-printed-design.webp', label:'Захиалгат хэвлэлийн жишээ'}],
    desc:'Урт бариултай цагаан канвас тоут цүнх. Лого, зураг хэвлэх боломжтой.',
    details:'Цагаан канвас даавуун тоут цүнх, урт бариултай. Сублимац хэвлэлээр лого, зураг хэвлэх боломжтой.',
    specs:[{label:'Хэмжээ',value:'38×32 см'},{label:'Материал',value:'100% цагаан канвас'},{label:'Хэвлэлт',value:'Сублимац'}],
    features:['Урт бариултай, авч явахад тохиромжтой','Дэлгүүр, сурталчилгаа болон бэлгийн уутанд тохирно','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_25.jpg', category:'Тэмдэг, медаль', name:'Дурсгалын медаллион',
    desc:'Тусгай арга хэмжээ, тэмцээн, баяр ёслолд зориулсан дурсгалын медаль.',
    details:'Тусгай арга хэмжээ, тэмцээн, баяр ёслолд зориулсан дурсгалын медаль. Лого, нэр, огноог нэг эсвэл хоёр талд нь гаргах боломжтой.',
    specs:[{label:'Материал',value:'Гууль'},{label:'Хэмжээ',value:'40 мм / 3 мм'},{label:'Өнгөлгөө',value:'Алт, мөнгө, хүрэл'},{label:'Хүргэлт',value:'2–3 хоног'}],
    features:['Нэг болон хоёр талд лого, нэр, огноо хэвлэнэ','Хүзүүний туузтай','Хайрцаг эсвэл ууттай савлагааны сонголттой'],
  },
  {
    image:'gallery_26.jpg', category:'Термо сав ба аяга', name:'Термо усны сав 580мл',
    desc:'Халуун, хүйтнээ удаан барих лазер хэвлэлтэй термо сав.',
    details:'Халуун, хүйтнээ удаан барьдаг 580мл термо сав. SUS304 ган дотортой, тагандаа зүүх оосортой.',
    specs:[{label:'Багтаамж',value:'580мл'},{label:'Материал',value:'SUS304 ган дотор'},{label:'Таг',value:'Оосортой'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Халуун, хүйтнээ удаан барина','Лазер хэвлэлээр лого, нэр гаргах боломжтой'],
  },
  {
    image:'gallery_27.jpg', category:'Термо сав ба аяга', name:'Термо сав 300мл — 4 өнгө',
    desc:'Авсаархан 300мл термо сав. Хар, улаан, улбар шар, цагаан өнгөний сонголттой.',
    details:'Цүнхэнд авч явахад тохиромжтой авсаархан термо сав. Хар, улаан, улбар шар, цагаан гэсэн дөрвөн өнгийн сонголттой.',
    specs:[{label:'Багтаамж',value:'300мл'},{label:'Материал',value:'SUS316 ган дотор'},{label:'Өнгө',value:'Хар, улаан, улбар шар, цагаан'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Авсаархан хэмжээтэй','Лазер хэвлэлээр лого, нэр бичих боломжтой'],
  },
  {
    image:'sub_mug.jpg', category:'Термо сав ба аяга', name:'Сублимац аяга 590мл',
    desc:'Гурван давхар ханатай ган аяга. Бүрэн өнгөт сублимац хэвлэлтэй.',
    details:'Гурван давхар хана бүхий ган аяга. Бүрэн өнгөт сублимац хэвлэлээр лого, дизайн, зургийг тодоор гаргаж, бэлэг болгон захиалах боломжтой.',
    specs:[{label:'Багтаамж',value:'590мл'},{label:'Материал',value:'SUS304 ган дотор'},{label:'Соруул',value:'Ган'},{label:'Хэвлэлт',value:'Бүрэн өнгөт сублимац'}],
    features:['Фото чанарын бүрэн өнгөт хэвлэл','Лого, нэр, зураг, дизайн хэвлэх боломжтой','Ган соруултай'],
  },
  {
    image:'owala_design.png', category:'Термо сав ба аяга', name:'Owala загварын кофены аяга',
    desc:'Дулаан тусгаарлалттай, уухад тав тухтай. Лого, нэр бичих боломжтой.',
    details:'Асгардаггүй, дулаан тусгаарлалттай, уухад тав тухтай кофены аяга. Лазер хэвлэлээр лого, нэр бичих боломжтой.',
    specs:[{label:'Онцлог',value:'Асгардаггүй'},{label:'Дулаан тусгаарлалт',value:'Тийм'},{label:'Хэвлэлт',value:'Лазер, UV'}],
    features:['Цүнхэнд хийгээд авч явахад тохиромжтой','Кофег удаан халуунаар хадгална','Лазер хэвлэлээр лого, нэр бичих боломжтой'],
  },
  {
    image:'coff_biege.jpg', category:'Термо сав ба аяга', name:'Зөөврийн кофены аяга',
    desc:'Гарын оосортой, оффис болон автомашинд хэрэглэхэд эвтэйхэн загвар.',
    details:'Гарт барихад тохиромжтой, гарын оосортой зөөврийн кофены аяга. Кофе шоп, оффис, автомашинд хэрэглэхэд тохиромжтой.',
    specs:[{label:'Таг',value:'Flip-top'},{label:'Өнгө',value:'Цагаан, хар, шаргал'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Гарын оосортой, авч явахад амар','Flip-top тагтай','Лого, нэр хэвлэх боломжтой'],
  },
  {
    image:'bottleB.jpg', category:'Термо сав ба аяга', name:'Термос сав 532мл',
    desc:'18oz зэвэрдэггүй ган сав, дулаан, хүйтнээ удаан хадгалж, бэлгийн хайрцагтай.',
    details:'Vacuum insulated технологитой, зэвэрдэггүй ган гадаргуутай 18oz термос сав. Дулаан, хүйтнээ удаан хадгална; гоёмсог хайрцагтай.',
    specs:[{label:'Багтаамж',value:'532мл / 18oz'},{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Өнгө',value:'Хар, хөх, шар'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Халуун, хүйтнээ удаан барина','Гоёмсог хайрцагтай, бэлэглэхэд тохиромжтой','Лого, нэрийг лазераар хэвлэх боломжтой'],
  },
  {
    image:'tyeso1.jpg', category:'Термо сав ба аяга', name:'TYESO зөөврийн аяга',
    desc:'Бариул, шулуус, flip-top тагтай; 10 гаруй өнгийн сонголттой.',
    details:'Бариул, шулуус болон flip-top таг бүхий зэвэрдэггүй ган аяга. Дулаан, хүйтнээ удаан хадгалж, авч явахад тохиромжтой; 10 гаруй өнгийн сонголттой.',
    specs:[{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Таг',value:'Flip-top + шулуус'},{label:'Бариул',value:'Байгаа'},{label:'Өнгө',value:'10 гаруй сонголт'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Авахад хялбар бариултай','Flip-top таг, шулуус хамт орсон','Дулаан, хүйтнээ удаан хадгална','Лого, нэр хэвлэх боломжтой'],
  },
  {
    image:'card-holder.jpg', category:'Карт холдер', name:'Металл карт холдер',
    desc:'RFID хамгаалалттай металл карт холдер. Брэндийн гарын бэлэгт тохиромжтой.',
    details:'RFID хамгаалалттай металл карт холдер. Гаднаас картны мэдээлэл уншигдахаас сэргийлж, лазер болон UV хэвлэлээр брэндийн нэр гаргах боломжтой.',
    specs:[{label:'Материал',value:'Хөнгөн цагаан металл'},{label:'Хамгаалалт',value:'RFID блокер'},{label:'Хэвлэлт',value:'Лазер, UV'}],
    features:['Картын мэдээллийг хамгаална','Брэндийн нэр, логог хэвлэх боломжтой'],
  },
  {
    image:'PVC unemleh.png', category:'Үнэмлэх', name:'PVC үнэмлэх',
    desc:'Зураг, QR код, оосортой үнэмлэх. Байгууллага, арга хэмжээнд тохиромжтой.',
    details:'Зурагтай, QR кодтой, хүзүүний оосортой PVC үнэмлэх. Бүрэн өнгөт UV хэвлэлээр лого, нэр, албан тушаал, ID дугаар хэвлэнэ.',
    specs:[{label:'Хэмжээ',value:'86×54мм'},{label:'Материал',value:'PVC хуванцар'},{label:'Хэвлэлт',value:'Бүрэн өнгөт UV'},{label:'Оосор',value:'Хүзүүний оосортой'}],
    features:['Зураг, нэр, албан тушаал, ID дугаар хэвлэнэ','QR код нэмэх боломжтой','Байгууллага, арга хэмжээний үнэмлэхэд тохиромжтой'],
  },
  {
    image:'Blue-notebook.png', category:'Дэвтэр ба үзэг', name:'Арьсан гадартай A5 дэвтэр',
    desc:'PU арьсан зөөлөн гадар, резинэн бэхэлгээ, үзэг углуулах хавчаартай.',
    details:'PU арьсан зөөлөн гадартай, резинэн бэхэлгээтэй A5 дэвтэр. Дотор шугамтай цаас, үзэг углуулах хавчаартай.',
    specs:[{label:'Хэмжээ',value:'A5'},{label:'Материал',value:'PU арьс, зузаан цаас'},{label:'Өнгө',value:'Цэнхэр, teal, шар'},{label:'Онцлог',value:'Резинэн бэхэлгээ, үзэгний хавчаар'},{label:'Хэвлэлт',value:'Лазер, UV'}],
    features:['Нэр, лого хэвлэх боломжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_28.jpg', category:'Сет', name:'Тэмдэглэлийн дэвтэр & Бал сет',
    desc:'A5 тэмдэглэлийн дэвтэр, бал, хайрцаг болон ууттай; 5 өнгөний сонголттой.',
    details:'A5 тэмдэглэлийн дэвтэр, балны сет, хайрцаг болон уут багтсан бэлгийн иж бүрдэл. Таван өнгийн сонголттой.',
    specs:[{label:'Дэвтэр',value:'A5, тууш шугамтай'},{label:'Үзэг',value:'Хар бэхтэй'},{label:'Нэмэлт',value:'Нөөц үзэгтэй'},{label:'Өнгө',value:'5 сонголт'}],
    features:['Дэвтэр, бал, хайрцаг, уут багтсан','Хурал, оффист хэрэглэхэд тохиромжтой','Лого хэвлүүлэх боломжтой'],
  },
  {
    image:'Blue-set.png', category:'Сет', name:'Дэвтэр & Үзгийн бэлгийн хайрцаг сет',
    desc:'A5 дэвтэр, хоёр үзэгтэй цэнхэр өнгийн тансаг бэлгийн сет.',
    details:'A5 дэвтэр болон хоёр үзэгтэй, цэнхэр өнгийн тансаг хайрцагтай бэлгийн сет. Байгууллагын бэлэгт тохиромжтой.',
    specs:[{label:'Агуулга',value:'A5 дэвтэр + 2 үзэг'},{label:'Өнгө',value:'Цэнхэр'},{label:'Савлагаа',value:'Бэлгийн хайрцаг'}],
    features:['Нэр, лого хэвлэх боломжтой','Тэмдэглэлт үйл явдлын бэлэгт тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_29.jpg', category:'Дэвтэр ба үзэг', name:'Тансаг үзэг хайрцагтай',
    desc:'Металл гадартай үзэгт нэрийг лазераар бичих боломжтой.',
    details:'Бичихэд гарт эвтэйхэн, металл гадартай тансаг үзэг. Лазер хэвлэлээр нэр бичих боломжтой.',
    specs:[{label:'Материал',value:'Металл'},{label:'Бэх',value:'Соруулдаг'},{label:'Хэвлэлт',value:'Лазер'},{label:'Савлагаа',value:'Хайрцагтай'}],
    features:['Тансаг хайрцагтай','Нэр, лого бичүүлэх боломжтой'],
  },
  {
    image:'pen-set.png', category:'Сет', name:'Металл үзэгний сет хайрцагтай',
    desc:'Хар тансаг хайрцагтай, хоёр металл үзэгний сет.',
    details:'Хар өнгийн тансаг хайрцагтай, rollerball болон stylus гэсэн хоёр металл үзэгний сет. Танилцуулга, шагнал, бэлэгт тохиромжтой.',
    specs:[{label:'Агуулга',value:'2 металл үзэг'},{label:'Өнгө',value:'Хар хайрцаг'},{label:'Хэвлэлт',value:'Лазер, UV'}],
    features:['Нэр, лого сийлэх боломжтой','Шагнал болон байгууллагын бэлэгт тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_30.jpg', category:'Дэвтэр ба үзэг', name:'Нарийн металл үзэг',
    desc:'Ногоон, цэнхэр өнгийн нарийн металл үзэг. Брэнд нэрийг лазераар сийлнэ.',
    details:'Ногоон, цэнхэр өнгийн нарийн металл үзэг. Лазер хэвлэлээр брэнд нэр, логог бичих боломжтой.',
    specs:[{label:'Материал',value:'Металл'},{label:'Өнгө',value:'Ногоон, цэнхэр'},{label:'Нөөц',value:'Сольдог'},{label:'Хэвлэлт',value:'Лазер'}],
    features:['Нарийн, гоёмсог загвартай','Удаан ашиглах боломжтой сольдог нөөцтэй'],
  },
  {
    image:'red-pen.png', category:'Дэвтэр ба үзэг', name:'Улаан металл үзэг',
    desc:'Улаан металл гадар, touch-screen stylus үзүүртэй загвар.',
    details:'Улаан өнгийн металл гадартай, touch-screen stylus үзүүртэй үзэг. Лазер хэвлэлээр нэр, лого бичих боломжтой.',
    specs:[{label:'Материал',value:'Металл'},{label:'Өнгө',value:'Улаан'},{label:'Онцлог',value:'Touch-screen stylus'},{label:'Хэвлэлт',value:'Лазер'}],
    features:['Нэр, лого бичүүлэх боломжтой','Байгууллага, арга хэмжээний бэлэгт тохиромжтой'],
  },
  {
    image:'gallery_31.jpg', category:'Бусад', name:'Кабелийн SS тэмдэглэгээ',
    desc:'Зэвэрдэггүй ган кабелийн тэмдэглэгээнд дугаар, нэрийг лазераар бичнэ.',
    details:'Зэвэрдэггүй ган кабелийн тэмдэглэгээнд дугаар, нэрийг лазераар бичнэ.',
    specs:[{label:'Хэмжээ 1',value:'PS 9.5×89мм'},{label:'Хэмжээ 2',value:'PS 19×89мм'},{label:'Хэмжээ 3',value:'CS 25×75мм'},{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Хэвлэлт',value:'Лазер'}],
    features:['Кабель, утас тэмдэглэхэд тохиромжтой','Гурван өөр хэмжээний сонголттой'],
  },
  {
    image:'badge-keychain.png', category:'Тэмдэг, медаль', name:'Дугуй badge түлхүүрийн оосор',
    desc:'Зураг, лого, текст болон QR кодыг дугуй badge оосорт бүрэн өнгөөр хэвлэнэ.',
    details:'Бүрэн өнгөт хэвлэлтэй дугуй badge оосор. Зураг, лого, текст, QR код хэвлэх боломжтой; ангийн уулзалт, байгууллагын арга хэмжээ болон бэлэгт тохиромжтой.',
    specs:[{label:'Хэлбэр',value:'Дугуй'},{label:'Материал',value:'Металл суурь, хуванцар бүрхүүл'},{label:'Хэвлэлт',value:'Бүрэн өнгөт'},{label:'Холбоос',value:'Металл цагираг'}],
    features:['QR код хэвлэх боломжтой','Цөөн болон олон тоогоор захиалах боломжтой'],
  },
  {
    image:'gallery_32.jpg', category:'Термо сав ба аяга', name:'Стэнли загвартай термо аяга',
    desc:'900мл багтаамжтай, SUS304 ган дотортой, соруултай аяга.',
    details:'900мл багтаамжтай, SUS304 зэвэрдэггүй ган дотортой термо аяга. Дотроо соруултай; лазер, UV, DTF хэвлэлээр захиалгат дизайн хийлгэх боломжтой.',
    specs:[{label:'Багтаамж',value:'900мл'},{label:'Материал',value:'SUS304 зэвэрдэггүй ган'},{label:'Онцлог',value:'Дотор соруултай'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Дотроо соруултай','Лого, дизайн хэвлэх боломжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_33.jpg', category:'Дэвтэр ба үзэг', name:'Арьсан тэмдэглэлийн дэвтэр',
    desc:'A5 хэмжээтэй, хүрэн, хөх, хар өнгийн сонголттой.',
    details:'A5 хэмжээтэй арьсан тэмдэглэлийн дэвтэр. Лазер, UV, DTF хэвлэлээр захиалж, хурлын хэрэглэл эсвэл байгууллагын бэлэг болгон ашиглахад тохиромжтой.',
    specs:[{label:'Хэмжээ',value:'A5'},{label:'Өнгө',value:'Хүрэн, хөх, хар'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Корпорат бэлэг, хурлын хэрэглэлд тохиромжтой','Нэр, лого хэвлүүлэх боломжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_34.jpg', category:'Дэвтэр ба үзэг', name:'Арьсан хавтастай нимгэн дэвтэр',
    desc:'A5 хэмжээтэй, саарал, хар, хөх өнгийн сонголттой.',
    details:'A5 хэмжээтэй, нимгэн арьсан хавтастай дэвтэр. Лазер, UV, DTF хэвлэлээр захиалж, байгууллагын бэлэг болон хурлын хэрэглэлд тохируулна.',
    specs:[{label:'Хэмжээ',value:'A5'},{label:'Өнгө',value:'Саарал, хар, хөх'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Корпорат бэлэг, хурлын хэрэглэлд тохиромжтой','Нэр, лого хэвлүүлэх боломжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_35.jpg', category:'Термо сав ба аяга', name:'Аяллын кофены ган аяга',
    desc:'300мл аяга, SUS304 дотортой, ган соруултай, хоёр янзаар нээгдэх тагтай.',
    details:'300мл багтаамжтай, SUS304 зэвэрдэггүй ган дотортой аяллын кофены аяга. Ган соруул, хоёр төрлөөр нээгдэх тагтай; нэр, дизайныг лазераар сийлнэ.',
    specs:[{label:'Багтаамж',value:'300мл'},{label:'Материал',value:'SUS304 зэвэрдэггүй ган'},{label:'Соруул',value:'Ган'},{label:'Таг',value:'2 төрлөөр нээгдэнэ'},{label:'Хэвлэлт',value:'Лазер'}],
    features:['Ган соруултай','Хоёр янзаар нээгдэх тагтай','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_36.jpg', category:'Түлхүүрийн оосор', name:'Олон үйлдэлт түлхүүрийн оосор',
    desc:'Лонх онгойлгогчтой хосолсон оосор; нэр, огноо, QR кодыг лазераар сийлнэ.',
    details:'Лонх онгойлгогч болон түлхүүрийн оосрыг нэгтгэсэн загвар. Нэр, огноо, QR кодыг лазераар сийлж, олон өнгийн сонголтоос захиалж болно.',
    specs:[{label:'Зориулалт',value:'Лонх онгойлгогч, түлхүүрийн оосор'},{label:'Хэвлэлт',value:'Лазер'},{label:'Өнгө',value:'Олон сонголт'}],
    features:['Нэр, огноо, QR код сийлүүлэх боломжтой','Ой, хурим, төрсөн өдрийн бэлэгт тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_37.jpg', category:'Түлхүүрийн оосор', name:'Металл түлхүүрийн оосор',
    desc:'Зэвэрдэггүй ган оосорт нэр, лого, огноог лазераар сийлнэ.',
    details:'Зэвэрдэггүй ган түлхүүрийн оосор. Нэр, лого, огноог лазераар сийлж, хурим, ой болон төрсөн өдрийн бэлэгт зориулан бэлгийн боодолтой захиалж болно.',
    specs:[{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Хэвлэлт',value:'Лазер'},{label:'Савлагаа',value:'Бэлгийн боодолтой'}],
    features:['Нэр, лого, огноо сийлүүлэх боломжтой','Бэлгийн боодолтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_38.jpg', category:'Термо сав ба аяга', name:'Цайны шүүртэй ган усны сав',
    desc:'520мл сав, цайны шүүр болон резинэн бариултай.',
    details:'520мл багтаамжтай, SUS304 зэвэрдэггүй ган дотортой усны сав. Цай хандлах шүүртэй, гарт сайн тогтох резинэн бариултай; лазер, UV, DTF хэвлэл боломжтой.',
    specs:[{label:'Багтаамж',value:'520мл'},{label:'Материал',value:'SUS304 зэвэрдэггүй ган'},{label:'Онцлог',value:'Цайны шүүр, резинэн бариул'},{label:'Хэвлэлт',value:'Лазер, UV, DTF'}],
    features:['Цай хандлах шүүртэй','Резинэн бариултай','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_39.jpg', category:'Зүүлт', name:'Зураг сийлбэртэй ган зүүлт',
    imageLabel:'Хосын хөрөгтэй сийлбэрийн жишээ',
    additionalImages:[
      {image:'gallery_40.jpg', label:'Тэврэлдсэн хосын сийлбэрийн жишээ'},
      {image:'gallery_41.jpg', label:'Хосын бүтэн дүрст сийлбэрийн жишээ'},
    ],
    desc:'50×30мм зэвэрдэггүй ган зүүлтэд зураг лазераар сийлж, хилэн хайрцагтай бэлдэнэ.',
    details:'50×30мм хэмжээтэй зэвэрдэггүй ган хавтан дээр хүссэн зургийг лазераар сийлнэ. Хилэн хайрцагтай тул хос, гэр бүл, дурсгалын бэлэгт тохиромжтой.',
    specs:[{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Хэмжээ',value:'50×30мм'},{label:'Хэвлэлт',value:'Зургийн лазер сийлбэр'},{label:'Савлагаа',value:'Хилэн хайрцаг'}],
    features:['Хүссэн зургийг лазераар сийлнэ','Хос, гэр бүл, дурсгалын бэлэгт тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_42.jpg', category:'Цаасан уут', name:'Цагаан цаасан уут',
    desc:'25×33×11см хэмжээтэй, лого болон дизайн хэвлэх боломжтой.',
    details:'25×33×11см хэмжээтэй, ороосон утсан бариултай цагаан цаасан уут. UV болон DTF хэвлэлээр лого, дизайн хэвлүүлэх боломжтой.',
    specs:[{label:'Хэмжээ',value:'25×33×11см'},{label:'Материал',value:'Цаас'},{label:'Бариул',value:'Ороосон утас'},{label:'Хэвлэлт',value:'UV, DTF'}],
    features:['Лого, дизайн хэвлэх боломжтой','UV болон DTF хэвлэлтэй','Дизайны зөвлөгөө үнэгүй'],
  },
  {
    image:'gallery_44.jpg', category:'Зүүлт', name:'Захиалгат нэрийн ган зүүлт',
    desc:'Нэр, үг, огноо эсвэл тэмдэг сийлсэн урт гинжтэй зүүлт.',
    details:'Зэвэрдэггүй ган зүүлтэд нэр, үг, огноо эсвэл тэмдэг захиалгаар сийлнэ. Урт гинжтэй бөгөөд хүссэн загвараар хийлгэж, хос, найз нөхөд, төрсөн өдрийн бэлэг болгон захиалж болно.',
    specs:[{label:'Материал',value:'Зэвэрдэггүй ган'},{label:'Гинж',value:'Урт гинжтэй'},{label:'Захиалга',value:'Нэр, үг, огноо, тэмдэг'},{label:'Хийц',value:'Захиалгат дизайн'}],
    features:['Нэр, үг, огноо, тэмдэг сийлүүлэх боломжтой','Хос, найз нөхөд, төрсөн өдрийн бэлэгт тохиромжтой','Дизайны зөвлөгөө үнэгүй'],
  },
];

function getProductId(product: Product) {
  return product.id ?? product.image.replace(/\.[^.]+$/, '');
}

const adminInitialProducts = products.map((product, index) => ({
  ...product,
  id: getProductId(product),
  sortOrder: index,
}));

function getProductFromSearch(search: string, items: Product[]) {
  const productId = new URLSearchParams(search).get('product');
  return items.find((product) => getProductId(product) === productId) ?? null;
}

function productImageUrl(image: string) {
  return image.startsWith('/api/') || image.startsWith('https://') || image.startsWith('http://')
    ? image
    : img(image);
}

function useProductCatalog() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/products/changes')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load product changes');
        return response.json() as Promise<Product[]>;
      }), loadCatalogDeletions()])
      .then(([changes, deletions]) => {
        if (!active) return;
        const initial = products.map((product, index) => ({
          ...product,
          id: getProductId(product),
          sortOrder: index,
        }));
        const changeById = new Map(changes.map((product) => [getProductId(product), product]));
        const initialIds = new Set(initial.map(getProductId));
        const merged = initial.map((product) => ({
          ...product,
          ...changeById.get(getProductId(product)),
        }));
        const added = changes.filter((product) => !initialIds.has(getProductId(product)));
        setCatalog(filterDeletedEntries([...merged, ...added], deletions, "product", getProductId)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { products: catalog, error };
}

function HomepageCarousel({ slides }: { slides: HomeHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [movement, setMovement] = useState<-1 | 1 | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const activeIndexRef = useRef(0);
  const movementRef = useRef<-1 | 1 | null>(null);
  const visibleSlideCount = 3;
  const trackStartIndex = movement === -1 && slides.length
    ? (activeIndex + slides.length - 1) % slides.length
    : activeIndex;
  const trackSlides = Array.from(
    { length: slides.length ? (movement === null ? Math.min(visibleSlideCount, slides.length) : visibleSlideCount + 1) : 0 },
    (_, slot) => {
      const index = (trackStartIndex + slot) % slides.length;
      return { slide: slides[index], index, slot };
    },
  );

  useEffect(() => {
    const nextIndex = Math.min(activeIndexRef.current, Math.max(slides.length - 1, 0));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    movementRef.current = null;
    setMovement(null);
  }, [slides.length]);

  const selectSlide = useCallback((direction: -1 | 1) => {
    if (!slides.length || movementRef.current !== null) return;
    movementRef.current = direction;
    setMovement(direction);
  }, [slides.length]);

  const finishMovement = useCallback(() => {
    const direction = movementRef.current;
    if (direction === null || !slides.length) return;
    const nextIndex = (activeIndexRef.current + direction + slides.length) % slides.length;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    movementRef.current = null;
    setMovement(null);
  }, [slides.length]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || isHovered || isFocused || prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        selectSlide(1);
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [slides.length, isHovered, isFocused, prefersReducedMotion, selectSlide]);

  return <div
    className={`hero-carousel${slides.length ? ' has-slides' : ''}`}
    role="region"
    aria-roledescription="carousel"
    aria-label="Бүтээгдэхүүн болон бүтээлийн сангийн зургууд"
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onFocusCapture={() => setIsFocused(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
    }}
  >
    {slides.length > 0 ? <>
      <div
        className={`hero-carousel-track${movement === 1 ? ' is-moving-left' : movement === -1 ? ' is-moving-right' : ''}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) finishMovement();
        }}
      >
        {trackSlides.map(({ slide, index, slot }) => <div
          className="hero-carousel-card"
          key={`${slide.key}-${slot}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`Зураг ${index + 1} / ${slides.length}: ${slide.title}`}
        >
          <img
            className="hero-carousel-image"
            src={slide.image.startsWith('/api/') || slide.image.startsWith('http') ? slide.image : img(slide.image)}
            alt={slide.alt}
            fetchPriority={slot === 0 ? 'high' : 'auto'}
            decoding="async"
          />
          <div className="hero-carousel-caption">
            <span>{slide.kind === 'product' ? 'Бүтээгдэхүүн' : 'Бүтээлийн сан'}</span>
            <strong>{slide.title}</strong>
          </div>
        </div>)}
      </div>
      {slides.length > 1 && <div className="hero-carousel-controls" aria-label="Зураг солих">
        <button type="button" onClick={() => selectSlide(-1)} disabled={movement !== null} aria-label="Өмнөх зураг"><ChevronLeft size={17}/></button>
        <span aria-hidden="true">{activeIndex + 1} / {slides.length}</span>
        <button type="button" onClick={() => selectSlide(1)} disabled={movement !== null} aria-label="Дараагийн зураг"><ChevronRight size={17}/></button>
      </div>}
    </> : <img
      className="hero-carousel-fallback"
      src={img('banner.png')}
      alt="Лазер болон UV хэвлэлийн үйлдвэрлэл"
      fetchPriority="high"
      decoding="async"
    />}
  </div>;
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (product: Product, trigger: HTMLButtonElement) => void }) {
  const openDetails = (event: MouseEvent<HTMLButtonElement>) => onSelect(product, event.currentTarget);
  return <article className="product-card" data-product-id={getProductId(product)}>
    <button type="button" className="product-card-image" onClick={openDetails} aria-haspopup="dialog" aria-label={`Зургийг томруулж, дэлгэрэнгүй үзэх: ${product.name}`}>
      <img src={productImageUrl(product.image)} alt={product.name} loading="lazy" decoding="async"/>
    </button>
     <div className="product-card-copy"><span>{product.category}</span><h3>{product.name}</h3><small>{product.desc}</small>
      <button type="button" className="product-card-open" onClick={openDetails} aria-haspopup="dialog">Дэлгэрэнгүй <ArrowRight size={14}/></button>
    </div>
  </article>;
}

function ProductGrid({ items, catalog = products, className }: { items: Product[]; catalog?: Product[]; className: string }) {
  const [selected, setSelected] = useState<Product | null>(() => getProductFromSearch(window.location.search, catalog));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const modalHistoryActiveRef = useRef(false);
  const syncSelectedFromUrl = useCallback(() => {
    modalHistoryActiveRef.current = false;
    setSelected(getProductFromSearch(window.location.search, catalog));
  }, [catalog]);
  useEffect(() => {
    syncSelectedFromUrl();
    window.addEventListener('popstate', syncSelectedFromUrl);
    return () => window.removeEventListener('popstate', syncSelectedFromUrl);
  }, [syncSelectedFromUrl]);
  useEffect(() => {
    if (!selected) return;
    const latestProduct = catalog.find((product) => getProductId(product) === getProductId(selected));
    if (latestProduct && latestProduct !== selected) setSelected(latestProduct);
  }, [catalog, selected]);
  const closeDialog = useCallback(() => {
    setSelected(null);
    if (modalHistoryActiveRef.current) {
      modalHistoryActiveRef.current = false;
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('product');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const selectProduct = (product: Product, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    const url = new URL(window.location.href);
    url.searchParams.set('product', getProductId(product));
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl);
      modalHistoryActiveRef.current = true;
    }
    setSelected(product);
  };
  const restoreFocus = useCallback(() => triggerRef.current?.focus({ preventScroll: true }), []);

  return <>
    <div className={className}>{items.map((product) => <ProductCard key={product.name} product={product} onSelect={selectProduct}/>)}</div>
    <ProductDetailDialog product={selected} onClose={closeDialog} restoreFocus={restoreFocus}/>
  </>;
}

function ProductDetailDialog({ product, onClose, restoreFocus }: { product: Product | null; onClose: () => void; restoreFocus: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const productImages = product
    ? [{ image: product.image, label: product.imageLabel ?? 'Хэмжээний зураг' }, ...(product.additionalImages ?? [])]
    : [];
  const activeProductImage = productImages[activeImageIndex] ?? productImages[0];

  useEffect(() => {
    if (!product) return;
    setActiveImageIndex(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      restoreFocus();
    };
  }, [product, onClose, restoreFocus]);

  if (!product || !activeProductImage) return null;

  return <div className="product-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" aria-describedby="product-dialog-description" ref={dialogRef}>
      <button type="button" className="product-dialog-close" onClick={onClose} aria-label="Дэлгэрэнгүй цонх хаах" ref={closeButtonRef}><X size={20}/></button>
      <div className="product-dialog-visual">
        <div className="product-dialog-main-image">
          <img src={productImageUrl(activeProductImage.image)} alt={`${product.name} — ${activeProductImage.label}`}/>
        </div>
        {productImages.length > 1 && <div className="product-dialog-gallery" role="group" aria-label={`${product.name} зургийн сонголт`}>
          {productImages.map((image, index) => <button
            type="button"
            key={image.image}
            className={index === activeImageIndex ? 'active' : ''}
            aria-pressed={index === activeImageIndex}
            aria-label={`${index + 1}-р зураг: ${image.label}`}
            onClick={() => setActiveImageIndex(index)}
          >
            <img src={img(image.image)} alt="" loading="lazy" decoding="async"/>
          </button>)}
        </div>}
      </div>
      <div className="product-dialog-content">
        <span className="product-dialog-type">{product.category}</span>
        <h2 id="product-dialog-title">{product.name}</h2>
        <p id="product-dialog-description">{product.details}</p>
        {product.specs.length > 0 && <div className="product-dialog-specs" aria-label="Бүтээгдэхүүний үзүүлэлт">
          {product.specs.map((spec, index) => <div className="product-dialog-spec" key={`${spec.label}-${index}`}><span>{spec.label}</span><strong>{spec.value}</strong></div>)}
        </div>}
        {product.features.length > 0 && <div className="product-dialog-features"><h3>Онцлог</h3><ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div>}
        <div className="product-dialog-actions">
          <a className="button button-red" href="tel:86681144"><Phone size={16}/> 8668 1144</a>
          <a href="https://www.facebook.com/profile.php?id=100063665375091" target="_blank" rel="noopener noreferrer">Facebook-ээр асуух <ArrowUpRight size={15}/></a>
        </div>
      </div>
    </div>
  </div>;
}
function Home() {
  const catalog = useProductCatalog();
  const [portfolioWorks, setPortfolioWorks] = useState<typeof PORTFOLIO_WORK>([]);
  const [portfolioLoadError, setPortfolioLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/portfolio/changes').then((response) => {
        if (!response.ok) throw new Error('Could not load portfolio changes');
        return response.json() as Promise<PortfolioWorkOverride[]>;
      }),
      loadCatalogDeletions(),
    ])
      .then(([changes, deletions]) => {
        if (!active) return;
        setPortfolioWorks(filterDeletedEntries(
          mergePortfolioWork(PORTFOLIO_WORK, changes),
          deletions,
          'portfolio',
          (item) => item.id,
        ));
        setPortfolioLoadError(false);
      })
      .catch(() => {
        if (active) setPortfolioLoadError(true);
      });
    return () => { active = false; };
  }, []);
  const heroSlides = buildHomeHeroSlides(
    catalog.error ? products : catalog.products,
    portfolioLoadError ? PORTFOLIO_WORK : portfolioWorks,
  );
  return <Shell>
    <section className="hero"><div className="hero-inner">
      <div><Eyebrow>Хэвлэл · Сийлбэр · Бэлэг</Eyebrow><h1>Таны санааг<br/><em>бодит болгоно.</em></h1><p className="hero-copy">Лазер болон дижитал хэвлэлийн шийдэл, байгууллагын брэнд бүтээгдэхүүн — нэг дороос.</p>
        <div className="actions"><a className="button button-red" href="https://m.me/100063665375091" target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> Чатаар холбогдох <ArrowUpRight size={16}/></a><ButtonLink href="/contact" outline>Бидэнтэй холбогдох</ButtonLink></div>
      </div><div className="hero-art"><HomepageCarousel slides={heroSlides}/><div className="hero-stamp"><img src={img('free-print-seal.png')} alt="" aria-hidden="true"/><span>БҮТЭЭГДЭХҮҮН<br/>АВБАЛ<br/>ХЭВЛЭЛ<br/>ҮНЭГҮЙ</span></div>{portfolioLoadError && <span className="sr-only" role="status">Бүтээлийн сангийн зураг ачаалагдсангүй.</span>}</div>
    </div></section>
    <div className="strip"><div className="strip-inner">
      <div className="strip-item"><Printer/>Дижитал хэвлэл</div><div className="strip-item"><Settings2/>Лазер технологи</div><div className="strip-item"><Package/>Захиалгат бүтээгдэхүүн</div><div className="strip-item"><ShieldCheck/>Чанартай гүйцэтгэл</div>
    </div></div>
    <section className="section home-services-section"><div className="section-heading"><div><SectionLabel>Бидний үйлчилгээ</SectionLabel><h2>Нэг санаа. Олон боломж.</h2></div><p>Төсөл бүрт тохирсон технологи, материалын сонголтоор санааг тань чанартай хэвлэл болгон хүргэнэ.</p></div>
      <div className="service-grid">{services.map(s=><Link className="service-card" href={s.href} key={s.n}><span className="index">{s.n} / 06</span><s.icon size={25}/><h3>{s.title}</h3><p>{s.desc}</p><ArrowUpRight size={18} className="card-arrow"/></Link>)}</div>
    </section>
    <section className="feature"><div className="feature-inner"><div className="feature-photo"><img src={img('uv_new.png')} alt="UV хэвлэлийн бүтээгдэхүүний үзэсгэлэн"/><span>ХЭВЛЭЛИЙН БОЛОМЖИЙГ НЭЭЕ</span></div><div className="feature-copy"><SectionLabel>Технологи ба ур чадвар</SectionLabel><h2>Бүтээгдэхүүн бүрт өөрийн өнгө төрх.</h2><p>UV, лазер, DTF хэвлэл болон цаасан хэвлэлийн төрөл бүрийн шийдлээр брэндийн өнгө төрхийг бодит эд зүйлд шингээнэ.</p><Link href="/portfolio" className="text-link">Бүтээлийн сан үзэх <ArrowRight size={16}/></Link></div></div></section>
    <section className="section"><div className="section-heading"><div><SectionLabel>Сонгомол бүтээгдэхүүн</SectionLabel><h2>Брэндээ өдөр бүр таниул.</h2></div><Link href="/products" className="text-link">Бүх бүтээгдэхүүн <ArrowRight size={16}/></Link></div>{catalog.error && <p className="catalog-load-warning" role="status">Шинэчилсэн бүтээгдэхүүний мэдээллийг татаж чадсангүй.</p>}<ProductGrid className="product-grid" items={catalog.products.slice(0,4)} catalog={catalog.products}/></section>
    <section className="cta-band"><div className="cta-inner"><div><h2>Төслөө ярилцъя.</h2><p>Санаагаа хэлээрэй. Тохирох шийдлийг хамтдаа олъё.</p></div><a href="tel:86681144" className="button"><Phone size={16}/> 8668 1144</a></div></section>
  </Shell>;
}
function PageHero({ overline, title, text }: { overline:string; title:string; text:string }) {
  return <section className="page-hero"><div className="page-hero-inner"><Eyebrow>{overline}</Eyebrow><h1>{title}</h1><p>{text}</p></div></section>;
}
function ServicesPage() {
  const details = [
    { id:'uv', title:'UV хэвлэл', image:'biz_detail_2.jpg', copy:'Шууд хэвлэх дэвшилтэт технологиор хавтгай болон төрөл бүрийн гадаргууд өнгөт хэвлэл хийнэ. Брэнд бүтээгдэхүүн, бэлэг дурсгалд тохиромжтой.', tags:['Сав, аяга','Гар утасны гэр','Бэлэг дурсгал'] },
    { id:'laser', title:'Лазер сийлбэр, зүсэлт', image:'Laserzurag.png', copy:'Металл, мод, арьс, акрил болон бусад материал дээр нарийн сийлбэр, зүсэлт гүйцэтгэнэ. Захиалгат тэмдэглэгээг материалд нь тохируулан боловсруулна.', tags:['Металл тэмдэглэгээ','Модон сийлбэр','Арьсан бүтээгдэхүүн'] },
    { id:'dtf', title:'DTF хэвлэл', image:'DTF.jpg', copy:'Өнгөний нарийвчлал сайтай DTF хэвлэлээр хувцас, даавуун бүтээгдэхүүнд байгууллагын лого, зураг болон загварыг буулгана.', tags:['Футболк','Даавуун тор','Малгай'] },
    { id:'paper', title:'Цаасан хэвлэл', image:'biz_service.jpg', copy:'Байгууллагын хэвлэлийн иж бүрэн шийдэл: нэрийн хуудас, брошюр, каталог болон танилцуулга материал.', tags:['Нэрийн хуудас','Брошюр','Каталог'] },
  ];
  return <Shell><PageHero overline="ХЭВЛЭЛИЙН ШИЙДЭЛ" title="Үйлчилгээ" text="Төслийн зорилго, материалд тохирсон хэвлэлийн технологийг санал болгож, санааг тань чанартай бүтээгдэхүүн болгоно."/>
    <div className="page-content services-content">{details.map((d,i)=><section className="split-layout service-detail" id={d.id} key={d.id}>{i%2===1&&<img src={img(d.image)} alt={d.title}/>}<div className="content-copy"><SectionLabel>0{i+1} · Хэвлэлийн үйлчилгээ</SectionLabel><h2>{d.title}</h2><p>{d.copy}</p><div className="tag-list">{d.tags.map(t=><span key={t}>{t}</span>)}</div><Link href="/contact" className="text-link">Дэлгэрэнгүй асуух <ArrowRight size={16}/></Link></div>{i%2===0&&<img src={img(d.image)} alt={d.title}/>}</section>)}</div>
    <Callout/></Shell>;
}
function ProductsPage() {
  const catalog = useProductCatalog();
  const currentProducts = catalog.products;
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>(() => getProductCategoryFromSearch(window.location.search));
  const [searchTerm, setSearchTerm] = useState('');
  const productCategories = productCategoryOrder.filter((category) => currentProducts.some((product) => product.category === category));
  useEffect(() => {
    const syncCategoryFromUrl = () => setActiveCategory(getProductCategoryFromSearch(window.location.search));
    window.addEventListener('popstate', syncCategoryFromUrl);
    return () => window.removeEventListener('popstate', syncCategoryFromUrl);
  }, []);
  const selectCategory = (category: ProductCategory | 'all') => {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.pushState(null, '', nextUrl);
    setActiveCategory(category);
  };
  const categoryProducts = activeCategory === 'all'
    ? currentProducts
    : currentProducts.filter((product) => product.category === activeCategory);
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const filteredProducts = normalizedSearchTerm
    ? categoryProducts.filter((product) => {
        const searchableText = [
          product.name,
          product.category,
          product.desc,
          product.details,
          ...product.specs.flatMap((spec) => [spec.label, spec.value]),
          ...product.features,
        ].join(' ').toLocaleLowerCase();
        return searchableText.includes(normalizedSearchTerm);
      })
    : categoryProducts;

  return <Shell><PageHero overline="ЗАХИАЛГАТ БЭЛЭГ · ПРОМОШН" title="Бүтээгдэхүүн" text="Өдөр тутмын хэрэглээний эд зүйлсийг танай брэндийн өнгө төрхтэй, дурсамжтай бэлэг болгон хувиргана."/>
    <div className="page-content">
      <div className="section-heading"><div><SectionLabel>Сонголтууд</SectionLabel><h2>Лого хэвлэлтэй бүтээгдэхүүн.</h2></div><p>Доорх бүтээгдэхүүнүүдэд хэвлэл, сийлбэрээр захиалгат шийдэл гаргана. Манайхаас бүтээгдэхүүн сонговол хэвлэл үнэгүй. Үнэ болон боломжийг лавлахад холбогдоорой.</p></div>
       {catalog.error && <p className="catalog-load-warning" role="status">Шинэчилсэн бүтээгдэхүүний мэдээллийг татаж чадсангүй. Одоо үндсэн жагсаалтыг харуулж байна.</p>}
       <div className="product-type-filters" role="group" aria-label="Бүтээгдэхүүний төрлөөр ангилах">
         <button type="button" className={activeCategory === 'all' ? 'active' : ''} aria-pressed={activeCategory === 'all'} onClick={() => selectCategory('all')}>Бүгд ({currentProducts.length})</button>
        {productCategories.map((category) => {
           const count = currentProducts.filter((product) => product.category === category).length;
          return <button key={category} type="button" className={activeCategory === category ? 'active' : ''} aria-pressed={activeCategory === category} onClick={() => selectCategory(category)}>{category} ({count})</button>;
        })}
      </div>
      <label className="product-search">
        <Search size={17} aria-hidden="true"/>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          placeholder="Нэр, тайлбар, үзүүлэлтээр хайх"
          aria-label="Бүтээгдэхүүний нэр, тайлбар, үзүүлэлтээр хайх"
        />
      </label>
      <p className="product-result-count" role="status" aria-live="polite" aria-atomic="true">{filteredProducts.length} бүтээгдэхүүн</p>
      {filteredProducts.length > 0
        ? <ProductGrid className="product-list" items={filteredProducts} catalog={currentProducts}/>
        : <div className="product-search-empty" role="status">
            <p>Таны хайлтад тохирох бүтээгдэхүүн олдсонгүй. Өөр түлхүүр үг эсвэл ангилал сонгоно уу.</p>
            <button type="button" onClick={() => setSearchTerm('')}>Хайлтыг цэвэрлэх</button>
          </div>}
      <div style={{marginTop:45}}><h2 style={{color:'#172b43'}}>Хэвлэлийн чиглэл</h2><div className="tag-list"><span>UV хэвлэл</span><span>Лазер сийлбэр</span><span>DTF хэвлэл</span><span>Бизнес хэвлэл</span><span>Захиалгат бэлэг</span></div></div>
    </div><Callout/></Shell>;
}
function EquipmentPage() {
  const [category, setCategory] = useState<'all' | 'laser' | 'printer'>('all');
  const equipment = [
    { image:'LASER_MACHINE.jpg', category:'laser', categoryLabel:'Лазер машин', status:'Зарагдаж байна', name:'Файбер лазер тэмдэглэгээний машин — 30W', subtitle:'Fiber Laser Marking Machine', description:'Металл зэрэг материал дээр нарийн тэмдэглэгээ хийх файбер лазер машин.', specs:['30W','10×10 см'] },
    { image:'LASER_KT4060.jpg', category:'laser', categoryLabel:'Лазер машин', status:'Захиалгаар', name:'KT-4060/5070/6090 үйлдвэрийн лазер сийлбэрийн машин', subtitle:'Industrial CO₂ Laser Engraving Machine', description:'Үйлдвэрийн лазер сийлбэрийн зориулалттай, хэд хэдэн ажлын талбайн сонголттой.', specs:['60–100W','6400 мм/мин'] },
    { image:'UV_LASER.jpg', category:'laser', categoryLabel:'UV лазер', status:'Захиалгаар', name:'UV лазер тэмдэглэгээний машин', subtitle:'UV Laser Marking Machine · Pulsex', description:'Нарийн UV лазер тэмдэглэгээ хийх зориулалттай төхөөрөмж.', specs:['3–20W','110×110 мм'] },
    { image:'UV_PLATBED.jpg', category:'printer', categoryLabel:'UV принтер', status:'UV Printer', name:'UV Flatbed Printer', subtitle:'Хатуу гадаргууны бүрэн өнгөт хэвлэл', description:'Металл, шил, хуванцар, мод, арьс зэрэг олон материалд бүрэн өнгөт хэвлэл хийнэ.', specs:['Металл','Шил','Хуванцар','Мод'] },
    { image:'DTF PRINTER.jpg', category:'printer', categoryLabel:'DTF принтер', status:'DTF Printer', name:'DTF Printer', subtitle:'Даавуунд зориулсан бүрэн өнгөт хэвлэл', description:'Хөвөн, полиэстер, нийлэг болон жинсэн даавуунд лого, загвар хэвлэнэ.', specs:['Хөвөн','Полиэстер','Жинс'] },
  ];
  const visibleEquipment = category === 'all' ? equipment : equipment.filter((item) => item.category === category);

  return <Shell><PageHero overline="ТОНОГ ТӨХӨӨРӨМЖ ХУДАЛДАА" title="Хэвлэлийн тоног төхөөрөмж" text="Лазер машин, UV болон DTF принтерийн сонголттой танилцаарай. Худалдан авагчдад суурилуулалт, сургалт, мэргэжлийн зөвлөгөө өгнө."/>
    <div className="page-content">
      <div className="equipment-filters" aria-label="Тоног төхөөрөмжийн ангилал">
        <button type="button" aria-pressed={category === 'all'} className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Бүгд (5)</button>
        <button type="button" aria-pressed={category === 'laser'} className={category === 'laser' ? 'active' : ''} onClick={() => setCategory('laser')}>Лазер машин (3)</button>
        <button type="button" aria-pressed={category === 'printer'} className={category === 'printer' ? 'active' : ''} onClick={() => setCategory('printer')}>Принтер (2)</button>
      </div>
      <div className="equipment-grid">
        {visibleEquipment.map((item) => <article className="equipment-card" key={item.name}>
          <img src={img(item.image)} alt={item.name} loading="lazy"/>
          <div className="equipment-card-body">
            <div className="equipment-card-meta"><span>{item.categoryLabel}</span><span className="equipment-status">{item.status}</span></div>
            <h2>{item.name}</h2><p className="equipment-subtitle">{item.subtitle}</p><p>{item.description}</p>
            <div className="tag-list">{item.specs.map((spec) => <span key={spec}>{spec}</span>)}</div>
            <div className="equipment-actions"><a href="tel:86681144"><Phone size={15}/> Утасдах</a><a href="https://www.facebook.com/profile.php?id=100063665375091" target="_blank" rel="noopener noreferrer">Facebook <ArrowUpRight size={15}/></a></div>
          </div>
        </article>)}
      </div>
      <div className="equipment-note"><p>Суурилуулалт, сургалт болон үнийн талаар дэлгэрэнгүй мэдээлэл авах бол бидэнтэй холбогдоорой.</p><a className="button button-red" href="tel:86681144"><Phone size={16}/> 8668 1144</a></div>
    </div>
  </Shell>;
}
function portfolioWorkImage(image: string) {
  return image.startsWith('/api/') || image.startsWith('https://') || image.startsWith('http://')
    ? image
    : img(image);
}

function PortfolioPage() {
  const [portfolioWorks, setPortfolioWorks] = useState<typeof PORTFOLIO_WORK>([]);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [portfolioLoadError, setPortfolioLoadError] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => getPortfolioRouteCategoryFromSearch(window.location.search));
  const [activeMaterial, setActiveMaterial] = useState(() => getPortfolioMaterialFromSearch(window.location.search));
  const [searchTerm, setSearchTerm] = useState(() => getPortfolioSearchTermFromSearch(window.location.search));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error' | 'shared' | 'unavailable' | 'share-error'>('idle');
  const [workCopyStatus, setWorkCopyStatus] = useState<'idle' | 'copied' | 'error' | 'shared' | 'unavailable' | 'share-error'>('idle');
  const [selectedWorkImage, setSelectedWorkImage] = useState(() => getPortfolioWorkFromSearch(window.location.search)?.image ?? null);
  const imageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modalHistoryActiveRef = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/portfolio/changes')
      .then(async (response) => {
        if (!response.ok) throw new Error('Бүтээлийн сангийн шинэ мэдээллийг ачаалж чадсангүй.');
        return response.json() as Promise<PortfolioWorkOverride[]>;
      }), loadCatalogDeletions()])
      .then(([changes, deletions]) => {
        if (!active) return;
        setPortfolioWorks(filterDeletedEntries(mergePortfolioWork(PORTFOLIO_WORK, changes),
          deletions, "portfolio", (item) => item.id));
        setPortfolioLoaded(true);
        setPortfolioLoadError('');
      })
      .catch((error: unknown) => {
        if (active) setPortfolioLoadError(error instanceof Error ? error.message : 'Бүтээлийн санг шинэчилж чадсангүй.');
      });
    return () => {
      active = false;
    };
  }, []);
  const closeImageDialog = useCallback(() => {
    if (modalHistoryActiveRef.current) {
      modalHistoryActiveRef.current = false;
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('work');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setSelectedWorkImage(null);
    setCopyStatus('idle');
  }, []);
  const restoreImageFocus = useCallback(() => imageTriggerRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (!portfolioLoaded) return;
    const syncPortfolioStateFromUrl = (fromHistory = false) => {
      const url = new URL(window.location.href);
      const work = getPortfolioWorkFromSearch(url.search, portfolioWorks);
      const category = getPortfolioRouteCategoryFromSearch(url.search, portfolioWorks);
      const material = getPortfolioMaterialFromSearch(url.search);
      if (url.searchParams.has('category') && category === 'all') {
        url.searchParams.delete('category');
      }
      if (url.searchParams.has('material') && material === 'all') {
        url.searchParams.delete('material');
      }
      if (url.searchParams.has('work') && !work) url.searchParams.delete('work');
      if (work && category !== getPortfolioCategoryFromSearch(url.search)) {
        url.searchParams.set('category', category);
      }
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) window.history.replaceState({}, '', nextUrl);
      modalHistoryActiveRef.current = fromHistory && Boolean(work);
      setActiveCategory(category);
      setActiveMaterial(material);
      setSearchTerm(getPortfolioSearchTermFromSearch(url.search));
      setSelectedWorkImage(work?.image ?? null);
      setCopyStatus('idle');
      setWorkCopyStatus('idle');
    };
    syncPortfolioStateFromUrl();
    const handlePopState = () => syncPortfolioStateFromUrl(true);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [portfolioWorks, portfolioLoaded]);
  const setWorkUrl = (image: string | null, replace = false) => {
    const url = new URL(window.location.href);
    if (image) url.searchParams.set('work', image);
    else url.searchParams.delete('work');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;
    if (replace) window.history.replaceState({}, '', nextUrl);
    else window.history.pushState({}, '', nextUrl);
    setCopyStatus('idle');
  };
  const selectCategory = (category: (typeof PORTFOLIO_CATEGORIES)[number]['id']) => {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    url.searchParams.delete('work');

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.pushState({}, '', nextUrl);
    setActiveCategory(category);
    setCopyStatus('idle');
    setSelectedWorkImage(null);
  };
  const selectMaterial = (material: (typeof PORTFOLIO_MATERIAL_OPTIONS)[number]['id']) => {
    const url = new URL(window.location.href);
    if (material === 'all') url.searchParams.delete('material');
    else url.searchParams.set('material', material);
    url.searchParams.delete('work');

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.pushState({}, '', nextUrl);
    setActiveMaterial(material);
    setCopyStatus('idle');
    setSelectedWorkImage(null);
  };
  const updateSearchTerm = (searchTerm: string) => {
    const url = new URL(window.location.href);
    if (searchTerm.trim()) url.searchParams.set('search', searchTerm);
    else url.searchParams.delete('search');

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.replaceState({}, '', nextUrl);
    setSearchTerm(searchTerm);
    setCopyStatus('idle');
  };
  const copyCategoryLink = async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };
  const shareCategoryLink = async () => {
    const share = window.navigator.share;
    if (typeof share !== 'function') {
      setCopyStatus('unavailable');
      return;
    }

    setCopyStatus('idle');
    try {
      const selectedCategory = PORTFOLIO_CATEGORIES.find((category) => category.id === activeCategory);
      const currentSearch = searchTerm.trim();
      await share.call(window.navigator, {
        title: 'Printed — Бүтээлийн сан',
        text: currentSearch
          ? `${selectedCategory?.label ?? 'Бүтээл'} ангиллын “${currentSearch}” хайлтын үр дүн`
          : `${selectedCategory?.label ?? 'Бүтээл'} ангиллын бүтээлүүд`,
        url: window.location.href,
      });
      setCopyStatus('shared');
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        setCopyStatus('idle');
        return;
      }
      setCopyStatus('share-error');
    }
  };
  const categoryWork = filterPortfolioWork(activeCategory, '', 'all', portfolioWorks);
  const visibleWork = filterPortfolioWork(activeCategory, searchTerm, activeMaterial, portfolioWorks);
  const selectedWorkIndex = selectedWorkImage
    ? visibleWork.findIndex((work) => work.image === selectedWorkImage || work.sourceImage === selectedWorkImage || work.id === selectedWorkImage)
    : -1;
  const dialogWorkIndex = selectedWorkIndex >= 0 ? selectedWorkIndex : null;
  const openWork = (image: string) => {
    modalHistoryActiveRef.current = true;
    setWorkUrl(image);
    setSelectedWorkImage(image);
    setWorkCopyStatus('idle');
  };
  const selectDialogWork = (index: number) => {
    const work = visibleWork[index];
    if (!work) return;
    setWorkUrl(work.image, true);
    setSelectedWorkImage(work.image);
    setWorkCopyStatus('idle');
  };
  const copyWorkLink = async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setWorkCopyStatus('copied');
    } catch {
      setWorkCopyStatus('error');
    }
  };
  const shareWorkLink = async () => {
    const share = window.navigator.share;
    if (typeof share !== 'function') {
      setWorkCopyStatus('unavailable');
      return;
    }

    setWorkCopyStatus('idle');
    try {
      const selectedWork = visibleWork.find((work) => work.image === selectedWorkImage);
      await share.call(window.navigator, {
        title: selectedWork?.title ?? 'Printed — Бүтээлийн сан',
        text: selectedWork?.title ?? 'Бүтээлийн сангийн жишээ ажил',
        url: window.location.href,
      });
      setWorkCopyStatus('shared');
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        setWorkCopyStatus('idle');
        return;
      }
      setWorkCopyStatus('share-error');
    }
  };

  return <Shell><PageHero overline="ХИЙСЭН АЖЛУУД" title="Бүтээлийн сан" text="Хэвлэл, сийлбэр, брэнд бүтээгдэхүүний ажлуудаас. Нэг бүрчлэн бодож, нямбай гүйцэтгэсэн шийдлүүд."/>
    <div className="page-content">
      {portfolioLoadError && <p className="admin-manager-state admin-manager-error" role="alert">{portfolioLoadError}</p>}
      <div className="portfolio-toolbar">
        <div className="portfolio-filters" role="group" aria-label="Хэвлэлийн төрлөөр шүүх">
          {PORTFOLIO_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={activeCategory === category.id ? 'active' : ''}
              aria-pressed={activeCategory === category.id}
              onClick={() => selectCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <label className="portfolio-material-filter">
          Материалаар шүүх
          <select
            value={activeMaterial}
            onChange={(event) => selectMaterial(event.currentTarget.value as (typeof PORTFOLIO_MATERIAL_OPTIONS)[number]['id'])}
            aria-label="Материалаар шүүх"
            data-testid="select-portfolio-material"
          >
            {PORTFOLIO_MATERIAL_OPTIONS.map((material) => (
              <option key={material.id} value={material.id}>{material.label}</option>
            ))}
          </select>
        </label>
        <label className="portfolio-search">
          <Search size={17} aria-hidden="true"/>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => updateSearchTerm(event.target.value)}
            placeholder="Нэр, тайлбараар хайх"
            aria-label="Бүтээлийн нэр, тайлбараар хайх"
            data-testid="input-search-portfolio"
          />
        </label>
        <button type="button" className="portfolio-copy-link" onClick={copyCategoryLink} data-testid="button-copy-portfolio-category-link">
          {copyStatus === 'copied' ? <Check size={16}/> : <Copy size={16}/>}
          {copyStatus === 'copied' ? 'Холбоос хууллаа' : 'Холбоос хуулах'}
        </button>
        <button type="button" className="portfolio-copy-link" onClick={shareCategoryLink} data-testid="button-share-portfolio-category-link">
          <Share2 size={16}/>
          Хуваалцах
        </button>
      </div>
      <div className="portfolio-search-suggestions" role="group" aria-label="Түгээмэл хайлтын санал">
        <span>Хайж үзэх:</span>
        {PORTFOLIO_SEARCH_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.searchTerm}
            type="button"
            aria-label={`${suggestion.kind}: ${suggestion.label}`}
            data-testid={`button-portfolio-search-suggestion-${suggestion.searchTerm}`}
            onClick={() => updateSearchTerm(suggestion.searchTerm)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <p className={`portfolio-copy-status${copyStatus === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
        {copyStatus === 'copied' ? 'Сонгосон ангиллын холбоосыг хууллаа.' : copyStatus === 'error' ? 'Холбоос хуулж чадсангүй. Доорх холбоосыг сонгон хуулна уу.' : copyStatus === 'shared' ? 'Ангиллын холбоосыг хуваалцах цонхонд нээлээ.' : copyStatus === 'unavailable' ? 'Таны хөтөч холбоос хуваалцах боломжгүй. Холбоос хуулах товчийг ашиглана уу.' : copyStatus === 'share-error' ? 'Хуваалцаж чадсангүй. Холбоос хуулах товчийг ашиглана уу.' : ''}
      </p>
      {copyStatus === 'error' && <label className="portfolio-copy-fallback">
        Холбоосыг сонгоод хуулна уу
        <input
          type="text"
          aria-label="Гараар хуулах холбоос"
          data-testid="input-manual-portfolio-category-link"
          readOnly
          value={window.location.href}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>}
      <p className="portfolio-result-count" role="status" aria-live="polite" aria-atomic="true">{visibleWork.length} бүтээл</p>
      {visibleWork.length > 0 ? <div className="work-grid">{visibleWork.map((item)=><article className="work-card" key={item.id}>
        <button
          type="button"
          className="work-card-image"
          aria-haspopup="dialog"
          aria-label={`Зургийг томруулж харах: ${item.title}`}
          data-testid={`button-open-portfolio-image-${item.image}`}
          onClick={(event) => {
            imageTriggerRef.current = event.currentTarget;
            openWork(item.image);
          }}
        >
          <img src={portfolioWorkImage(item.image)} alt={item.title} loading="lazy" decoding="async"/>
        </button>
        <p>{item.title}</p>
        <small>{item.description}</small>
        <div className="portfolio-material-tags" aria-label="Ашигласан материал">
          {PORTFOLIO_MATERIAL_OPTIONS.filter((material) => material.id !== 'all' && item.materials.includes(material.id)).map((material) => (
            <span key={material.id}>{material.label}</span>
          ))}
        </div>
      </article>)}</div> : categoryWork.length === 0 && activeCategory !== 'all' ? <div className="portfolio-empty" data-testid="status-portfolio-empty-category">
        <p role="status" aria-live="polite">Энэ ангилалд одоогоор жишээ бүтээл алга байна.</p>
        <button type="button" onClick={() => selectCategory('all')} data-testid="button-reset-portfolio-category">Бүгд</button>
      </div> : <p className="portfolio-empty" role="status" aria-live="polite" data-testid="status-portfolio-no-results">Таны хайлтад тохирох бүтээл олдсонгүй. Өөр түлхүүр үг эсвэл ангилал сонгоно уу.</p>}
      <PortfolioImageDialog
        works={visibleWork}
        currentIndex={dialogWorkIndex}
        onSelectIndex={selectDialogWork}
        onClose={closeImageDialog}
        restoreFocus={restoreImageFocus}
        copyStatus={workCopyStatus}
        onCopyLink={copyWorkLink}
        onShareLink={shareWorkLink}
      />
      <div style={{textAlign:'center',marginTop:42}}><ButtonLink href="/contact">Төсөл эхлүүлэх</ButtonLink></div>
    </div></Shell>;
}
function PortfolioImageDialog({
  works,
  currentIndex,
  onSelectIndex,
  onClose,
  restoreFocus,
  copyStatus,
  onCopyLink,
  onShareLink,
}: {
  works: { image: string; title: string }[];
  currentIndex: number | null;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
  restoreFocus: () => void;
  copyStatus: 'idle' | 'copied' | 'error' | 'shared' | 'unavailable' | 'share-error';
  onCopyLink: () => void;
  onShareLink: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageViewportRef = useRef<HTMLButtonElement | null>(null);
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const mouseDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    scrollLeft: number;
    scrollTop: number;
    centerX: number;
    centerY: number;
    paddingLeft: number;
    paddingTop: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const isZoomed = zoomScale > 1;
  const navigationRef = useRef({ currentIndex, itemCount: works.length, onSelectIndex });
  navigationRef.current = { currentIndex, itemCount: works.length, onSelectIndex };
  const image = currentIndex === null ? null : works[currentIndex] ?? null;

  useEffect(() => {
    setZoomScale(1);
    setIsMouseDragging(false);
    touchPointsRef.current.clear();
    mouseDragRef.current = null;
    pinchStartRef.current = null;
    if (imageViewportRef.current) {
      imageViewportRef.current.scrollLeft = 0;
      imageViewportRef.current.scrollTop = 0;
    }
  }, [image?.image]);

  const handleImagePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') {
      if (!isZoomed || event.button !== 0) return;
      const viewport = event.currentTarget;
      mouseDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        moved: false,
      };
      suppressClickRef.current = false;
      viewport.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.pointerType !== 'touch') return;
    if (touchPointsRef.current.size === 0) suppressClickRef.current = false;
    touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (touchPointsRef.current.size === 2) {
      const [first, second] = [...touchPointsRef.current.values()];
      const viewport = event.currentTarget;
      const bounds = viewport.getBoundingClientRect();
      const styles = window.getComputedStyle(viewport);
      const centerX = (first.x + second.x) / 2 - bounds.left;
      const centerY = (first.y + second.y) / 2 - bounds.top;
      pinchStartRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: zoomScale,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        centerX,
        centerY,
        paddingLeft: Number.parseFloat(styles.paddingLeft) || 0,
        paddingTop: Number.parseFloat(styles.paddingTop) || 0,
      };
      suppressClickRef.current = true;
      event.preventDefault();
    }
  };

  const handleImagePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const mouseDrag = mouseDragRef.current;
    if (event.pointerType === 'mouse' && mouseDrag?.pointerId === event.pointerId) {
      const deltaX = event.clientX - mouseDrag.startX;
      const deltaY = event.clientY - mouseDrag.startY;
      if (!mouseDrag.moved && Math.hypot(deltaX, deltaY) < 4) return;
      mouseDrag.moved = true;
      setIsMouseDragging(true);
      event.currentTarget.scrollLeft = mouseDrag.scrollLeft - deltaX;
      event.currentTarget.scrollTop = mouseDrag.scrollTop - deltaY;
      event.preventDefault();
      return;
    }
    if (!touchPointsRef.current.has(event.pointerId)) return;
    const previousPoint = touchPointsRef.current.get(event.pointerId)!;
    touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pinchStart = pinchStartRef.current;
    if (!pinchStart || touchPointsRef.current.size < 2) {
      if (zoomScale > 1) {
        event.currentTarget.scrollLeft -= event.clientX - previousPoint.x;
        event.currentTarget.scrollTop -= event.clientY - previousPoint.y;
        event.preventDefault();
      }
      return;
    }

    const [first, second] = [...touchPointsRef.current.values()];
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const nextScale = Math.min(4, Math.max(1, pinchStart.scale * distance / pinchStart.distance));
    const viewport = event.currentTarget;
    const bounds = viewport.getBoundingClientRect();
    const centerX = (first.x + second.x) / 2 - bounds.left;
    const centerY = (first.y + second.y) / 2 - bounds.top;
    setZoomScale(nextScale);

    const ratio = nextScale / pinchStart.scale;
    requestAnimationFrame(() => {
      viewport.scrollLeft = (pinchStart.scrollLeft + pinchStart.centerX - pinchStart.paddingLeft) * ratio
        - centerX + pinchStart.paddingLeft;
      viewport.scrollTop = (pinchStart.scrollTop + pinchStart.centerY - pinchStart.paddingTop) * ratio
        - centerY + pinchStart.paddingTop;
    });
    event.preventDefault();
  };

  const handleImagePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const mouseDrag = mouseDragRef.current;
    if (event.pointerType === 'mouse' && mouseDrag?.pointerId === event.pointerId) {
      if (event.type === 'pointerup' && mouseDrag.moved) suppressClickRef.current = true;
      else if (event.type === 'pointercancel') suppressClickRef.current = false;
      mouseDragRef.current = null;
      setIsMouseDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (!touchPointsRef.current.has(event.pointerId)) return;
    touchPointsRef.current.delete(event.pointerId);
    if (touchPointsRef.current.size < 2) pinchStartRef.current = null;
  };

  const handleImageKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isZoomed || !event.shiftKey) return;

    const directions: Record<string, { left: number; top: number }> = {
      ArrowLeft: { left: -1, top: 0 },
      ArrowRight: { left: 1, top: 0 },
      ArrowUp: { left: 0, top: -1 },
      ArrowDown: { left: 0, top: 1 },
    };
    const direction = directions[event.key];
    if (!direction) return;

    const viewport = event.currentTarget;
    const distance = Math.max(48, Math.round(Math.min(viewport.clientWidth, viewport.clientHeight) * 0.15));
    viewport.scrollLeft += direction.left * distance;
    viewport.scrollTop += direction.top * distance;
    event.preventDefault();
  };

  useEffect(() => {
    if (currentIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const { currentIndex: index, itemCount, onSelectIndex: selectIndex } = navigationRef.current;
        if (index === null) return;
        const nextIndex = index + (event.key === 'ArrowRight' ? 1 : -1);
        if (nextIndex >= 0 && nextIndex < itemCount) selectIndex(nextIndex);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      restoreFocus();
    };
  }, [currentIndex !== null, onClose, restoreFocus]);

  if (!image) return null;

  return <div className="portfolio-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div
      className="portfolio-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-dialog-title"
      ref={dialogRef}
    >
      <button
        type="button"
        className="portfolio-dialog-nav portfolio-dialog-previous"
        onClick={() => currentIndex !== null && onSelectIndex(currentIndex - 1)}
        aria-label="Өмнөх бүтээл"
        data-testid="button-previous-portfolio-image"
        disabled={currentIndex === 0}
      >
        <ChevronLeft size={25}/>
      </button>
      <button
        type="button"
        className="portfolio-dialog-nav portfolio-dialog-next"
        onClick={() => currentIndex !== null && onSelectIndex(currentIndex + 1)}
        aria-label="Дараагийн бүтээл"
        data-testid="button-next-portfolio-image"
        disabled={currentIndex === works.length - 1}
      >
        <ChevronRight size={25}/>
      </button>
      <button type="button" className="portfolio-dialog-close" onClick={onClose} aria-label="Зургийг хаах" ref={closeButtonRef}><X size={21}/></button>
      <button
        type="button"
        className={`portfolio-dialog-image-toggle${isZoomed ? ' is-zoomed' : ''}${isMouseDragging ? ' is-dragging' : ''}`}
        ref={imageViewportRef}
        onPointerDown={handleImagePointerDown}
        onPointerMove={handleImagePointerMove}
        onPointerUp={handleImagePointerEnd}
        onPointerCancel={handleImagePointerEnd}
        onKeyDown={handleImageKeyDown}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            return;
          }
          setZoomScale((scale) => {
            const nextScale = scale > 1 ? 1 : 2;
            if (nextScale === 1 && imageViewportRef.current) {
              imageViewportRef.current.scrollLeft = 0;
              imageViewportRef.current.scrollTop = 0;
            }
            return nextScale;
          });
        }}
        aria-label={isZoomed ? 'Зургийг анхны хэмжээнд буцаах' : 'Зургийг томруулж харах'}
        aria-describedby="portfolio-image-keyboard-help"
        aria-keyshortcuts={isZoomed ? 'Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown' : undefined}
        aria-pressed={isZoomed}
        title={isZoomed ? 'Анхны хэмжээнд буцаах' : 'Томруулж харах'}
      >
        <img
          className="portfolio-dialog-image"
          src={img(image.image)}
          alt={image.title}
          data-testid={`img-portfolio-dialog-${image.image}`}
          style={{ width: `${zoomScale * 100}%`, height: `${zoomScale * 100}%` }}
        />
      </button>
      <span id="portfolio-image-keyboard-help" className="sr-only">
        Томруулсны дараа Shift болон суман товчоор зургийг шилжүүлнэ. Shift-гүй зүүн, баруун суман товчоор бүтээл солино.
      </span>
      <div className="portfolio-dialog-caption">
        <p id="portfolio-dialog-title" aria-live="polite">{image.title}</p>
        <div className="portfolio-dialog-caption-actions">
          <span className="portfolio-dialog-count">{(currentIndex ?? 0) + 1} / {works.length}</span>
          <button type="button" className="portfolio-dialog-share" onClick={onShareLink} aria-label="Энэ бүтээлийг хуваалцах" data-testid="button-share-portfolio-work-link">
            <Share2 size={15}/>
            Хуваалцах
          </button>
          <button type="button" className="portfolio-dialog-share" onClick={onCopyLink} aria-label="Энэ бүтээлийн холбоосыг хуулах" data-testid="button-copy-portfolio-work-link">
            {copyStatus === 'copied' ? <Check size={15}/> : <Copy size={15}/>}
            {copyStatus === 'copied' ? 'Хууллаа' : 'Холбоос хуулах'}
          </button>
        </div>
        <span className={`portfolio-dialog-share-status${copyStatus === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
          {copyStatus === 'copied' ? 'Энэ бүтээлийн холбоосыг хууллаа.' : copyStatus === 'error' ? 'Холбоос хуулж чадсангүй.' : copyStatus === 'shared' ? 'Энэ бүтээлийн холбоосыг хуваалцах цонхонд нээлээ.' : copyStatus === 'unavailable' ? 'Таны хөтөч холбоос хуваалцах боломжгүй. Холбоос хуулах товчийг ашиглана уу.' : copyStatus === 'share-error' ? 'Хуваалцаж чадсангүй. Холбоос хуулах товчийг ашиглана уу.' : ''}
        </span>
      </div>
    </div>
  </div>;
}

function ProcessPage() {
  const steps = [
    ['01','Холбоо барих','86681144 дугаарт залгах эсвэл Facebook-т бичих.'],
    ['02','Дизайн тохирох','Лого болон хэвлэлтийн дизайнаа хамтран тохирно.'],
    ['03','Үйлдвэрлэл','Батлагдсан дизайнаар үйлдвэрлэл эхэлнэ.'],
    ['04','Хүлээн авах','Бэлэн болмогц хүргэж өгөх эсвэл очиж авна.'],
  ];
  return <Shell><PageHero overline="ХАМТЫН АЖЛЫН ҮЕ ШАТ" title="Үйл явц" text="Санаанаас бэлэн бүтээгдэхүүн хүртэл ойлгомжтой, нягт хамтын ажиллагаа."/>
    <div className="page-content"><div className="section-heading"><div><SectionLabel>4 үе шат</SectionLabel><h2>Эхлэлээс гүйцэтгэл хүртэл.</h2></div><p>Хүсэлтээ утсаар эсвэл биечлэн танилцуулна. Захиалга бодитоор тохиролцож, шаардлагатай мэдээллээ баталгаажуулсны дараа үйлдвэрлэл эхэлнэ.</p></div><div className="steps">{steps.map(([number,title,description])=><article className="step" key={number}><b>ҮЕ ШАТ {number}</b><h3>{title}</h3><p>{description}</p></article>)}</div><div className="split-layout" style={{marginTop:70}}><div className="content-copy"><SectionLabel>Бэлтгэх мэдээлэл</SectionLabel><h2>Яриагаа эхлүүлэхэд</h2><p>Бүтээгдэхүүний жишээ зураг, тоо хэмжээ, хэвлэх лого эсвэл загвараа бэлдээрэй. Эцсийн үнэ болон хугацааг ажлын дэлгэрэнгүйг ярилцсаны дараа тохирно.</p><div className="tag-list"><span>Бүтээгдэхүүний төрөл</span><span>Тоо хэмжээ</span><span>Загварын файл</span><span>Хүссэн хугацаа</span></div><Link className="text-link" href="/contact">Холбоо барих <ArrowRight size={16}/></Link></div><img src={img('biz_new.png')} alt="Хэвлэлийн төрөл бүрийн бүтээгдэхүүн ба үйлдвэрлэл"/></div></div></Shell>;
}
function ContactPage() {
  return <Shell><PageHero overline="БИДЭНТЭЙ ХОЛБОГДОХ" title="Санаагаа ярилцъя." text="Үйлчилгээ, бүтээгдэхүүн, тоног төхөөрөмжийн талаар асуух зүйл байвал бидэнтэй шууд холбогдоорой."/>
    <div className="page-content"><div className="contact-layout"><div className="contact-panel"><SectionLabel>Холбоо барих</SectionLabel><h2>Бид туслахад бэлэн.</h2>
      <div className="contact-row"><Phone/><div><span>Утас</span><a href="tel:85882030">8588 2030</a><br/><a href="tel:86681144">8668 1144</a></div></div>
      <div className="contact-row"><MapPin/><div><span>Хаяг</span><strong>БЗД, 16-р хороолол</strong></div></div>
      <div className="contact-row"><BriefcaseBusiness/><div><span>Facebook</span><a href="https://www.facebook.com/profile.php?id=100063665375091" target="_blank" rel="noopener noreferrer">Page руу орох</a></div></div>
      <div className="contact-row"><Clock3/><div><span>Холбоо барих</span><strong>Ажлын өдрүүдэд</strong></div></div>
    </div><div className="map-panel"><MapPin size={34}/><h3>Printed · All printing • Custom gifts</h3><p>Улаанбаатар хот<br/>Биечлэн уулзахын өмнө утсаар холбогдоно уу.</p><a className="text-link" href="tel:85882030">8588 2030 руу залгах <ArrowRight size={16}/></a></div></div></div></Shell>;
}
function Callout() { return <section className="cta-band"><div className="cta-inner"><div><h2>Танд ямар хэвлэл хэрэгтэй вэ?</h2><p>Төслийнхөө талаар ярилцахад бид баяртай.</p></div><a href="tel:86681144" className="button"><Phone size={16}/> 8668 1144</a></div></section>; }
function NotFound() {
  return <Shell><div className="not-found"><div className="label">ХУУДАС ОЛДСОНГҮЙ</div><h1>404</h1><p>Таны хайсан хуудас байхгүй эсвэл өөрчлөгдсөн байна.</p><ButtonLink href="/">Нүүр хуудас руу буцах</ButtonLink></div></Shell>;
}
function Router() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
    const metadata = pageMetadata[path] ?? pageMetadata.notFound;
    document.title = metadata.title;

    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = content;
    };
    setMeta('name', 'description', metadata.description);
    setMeta('property', 'og:title', metadata.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('name', 'twitter:title', metadata.title);
    setMeta('name', 'twitter:description', metadata.description);
  }, [location]);
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/sign-in/*?" component={SignInPage}/>
    <Route path="/sign-up/*?" component={SignUpPage}/>
    <Route path="/admin">{() => <AdminPage initialProducts={adminInitialProducts} initialPortfolio={PORTFOLIO_WORK}/>}</Route>
    <Route path="/" component={Home}/><Route path="/services" component={ServicesPage}/>
    <Route path="/products" component={ProductsPage}/><Route path="/equipment-sale" component={EquipmentPage}/>
    <Route path="/portfolio" component={PortfolioPage}/><Route path="/process" component={ProcessPage}/>
    <Route path="/contact" component={ContactPage}/><Route component={NotFound}/>
  </Switch></ErrorBoundary>;
}
function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes/></WouterRouter>;
}
function stripBasePath(path: string) {
  if (!basePath || !path.startsWith(basePath)) return path;
  return path.slice(basePath.length) || '/';
}
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
        queryClient.clear();
      }
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener]);
  return null;
}
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const signInUrl = `${basePath}/sign-in`;
  const signUpUrl = `${basePath}/sign-up`;
  return <ClerkProvider
    publishableKey={publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)}
    proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}
    signInUrl={signInUrl}
    signUpUrl={signUpUrl}
    routerPush={(to) => setLocation(stripBasePath(to))}
    routerReplace={(to) => setLocation(stripBasePath(to), { replace: true })}
    appearance={{
      theme: shadcn,
      options: { logoImageUrl: `${window.location.origin}${basePath}/logo.svg`, logoPlacement: 'inside' },
      variables: {
        colorPrimary: '#c91e32',
        colorBackground: '#faf9f5',
        colorForeground: '#172b43',
        colorInput: '#ffffff',
        colorInputForeground: '#172b43',
        fontFamily: 'DM Sans, sans-serif',
        borderRadius: '8px',
      },
    }}
    localization={{
      signIn: { start: { title: 'Нэвтрэх', subtitle: 'Бүртгэлдээ нэвтэрч үргэлжлүүлнэ үү.' } },
      signUp: { start: { title: 'Бүртгүүлэх', subtitle: 'Printed-д хэрэглэгчийн бүртгэл үүсгэнэ үү.' } },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator/>
      <TooltipProvider><Router/><Toaster/></TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}
export default App;
