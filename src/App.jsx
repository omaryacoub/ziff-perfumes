import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./App.css";

const INSTAGRAM_URL = "https://www.instagram.com/ziff.perfumes/";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRs4VnoHfhuKm6APcEY3f48vhtivA-enlOGDVCWGKUeBFegFypBJjkpCmgq-6GDJj1MPHMxDunb8PP0/pub?output=csv";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85";

const translations = {
  en: {
    eyebrow: "FIND YOUR SIGNATURE SCENT",
    title: "A fragrance that feels like you.",
    subtitle:
      "Explore a curated collection of scents, discover their notes, and find your next signature fragrance.",
    explore: "Explore collection",
    collection: "THE COLLECTION",
    collectionTitle: "Find your next fragrance",
    collectionSubtitle:
      "Every scent tells a different story. Find the one that tells yours.",
    search: "Search fragrances or brands...",
    all: "All fragrances",
    men: "For him",
    women: "For her",
    unisex: "Unisex",
    products: "fragrances",
    notes: "FRAGRANCE NOTES",
    discover: "Discover this scent",
    size: "Size",
    family: "Scent family",
    from: "Curated for you",
    footerText: "A breeze to remember.",
    footerSub: "Discover fragrances that express your individuality.",
    contact: "Find us on Instagram",
    empty: "No fragrances found.",
    emptySub: "Try another name or category.",
    currency: "EGP",
    about: "THE ART OF SCENT",
    aboutTitle: "More than a fragrance.",
    aboutText:
      "The right fragrance is personal. Explore scent profiles, discover new notes, and choose the one that feels unmistakably yours.",
    noteFallback: "Explore the character of this fragrance.",
    menu: "Menu",
    allNotes: "Explore the notes",
    brandLabel: "FRAGRANCE",
    loading: "Loading our fragrance collection...",
    loadError: "We couldn't load the fragrance collection.",
    loadErrorSub: "Please check your connection and try again.",
    retry: "Try again",
  },
  ar: {
    eyebrow: "اكتشف عطرك المميز",
    title: "عطر يشبه شخصيتك.",
    subtitle:
      "اكتشف مجموعتنا المختارة من العطور، وتعرّف على نوتاتها، واعثر على عطرك القادم.",
    explore: "اكتشف المجموعة",
    collection: "مجموعة العطور",
    collectionTitle: "اعثر على عطرك القادم",
    collectionSubtitle:
      "لكل عطر حكاية مختلفة. اكتشف العطر الذي يشبه حكايتك.",
    search: "ابحث باسم العطر أو الماركة...",
    all: "كل العطور",
    men: "رجالي",
    women: "حريمي",
    unisex: "يونيسكس",
    products: "عطور",
    notes: "النوتات العطرية",
    discover: "اكتشف العطر",
    size: "الحجم",
    family: "العائلة العطرية",
    from: "اختيرت بعناية من أجلك",
    footerText: "نسمة لا تُنسى.",
    footerSub: "اكتشف عطورًا تعبّر عن شخصيتك.",
    contact: "تابعنا على إنستجرام",
    empty: "لم نعثر على عطور.",
    emptySub: "جرّب اسمًا أو تصنيفًا آخر.",
    currency: "جنيه",
    about: "فن العطور",
    aboutTitle: "العطر أكثر من مجرد رائحة.",
    aboutText:
      "اختيار العطر تجربة شخصية. اكتشف العائلات العطرية والنوتات المختلفة، واعثر على العطر الذي يعبّر عنك.",
    noteFallback: "اكتشف طابع هذا العطر.",
    menu: "القائمة",
    allNotes: "اكتشف النوتات",
    brandLabel: "العطر",
    loading: "جاري تحميل مجموعة العطور...",
    loadError: "تعذّر تحميل مجموعة العطور.",
    loadErrorSub: "تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
    retry: "إعادة المحاولة",
  },
};

const categories = ["all", "men", "women", "unisex"];

function clean(value) {
  return String(value ?? "").trim();
}

function parseActive(value) {
  return ["true", "1", "yes"].includes(clean(value).toLowerCase());
}

function parseNotes(value) {
  return clean(value)
    .split("|")
    .map((note) => note.trim())
    .filter(Boolean);
}

function normalizePerfume(row) {
  return {
    id: clean(row.id),
    name_en: clean(row.name_en),
    name_ar: clean(row.name_ar),
    brand_en: clean(row.brand_en),
    brand_ar: clean(row.brand_ar),
    category: clean(row.category).toLowerCase(),
    price: Number(clean(row.price).replace(/[^\d.-]/g, "")),
    size: clean(row.size),
    family_en: clean(row.family_en),
    family_ar: clean(row.family_ar),
    notes_en: parseNotes(row.notes_en),
    notes_ar: parseNotes(row.notes_ar),
    description_en: clean(row.description_en),
    description_ar: clean(row.description_ar),
    image_url: clean(row.image_url),
    badge_en: clean(row.badge_en),
    badge_ar: clean(row.badge_ar),
    active: parseActive(row.active),
  };
}

function App() {
  const [language, setLanguage] = useState("ar");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const t = translations[language];
  const isArabic = language === "ar";

  useEffect(() => {
    const controller = new AbortController();

    async function loadPerfumes() {
      setLoading(true);
      setLoadError(false);

      try {
        const response = await fetch(SHEET_CSV_URL, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load catalog: ${response.status}`);
        }

        const csvText = await response.text();

        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => header.trim(),
        });

        if (result.errors.length > 0) {
          console.warn("Some CSV rows could not be parsed:", result.errors);
        }

        const loadedPerfumes = result.data
          .map(normalizePerfume)
          .filter(
            (perfume) =>
              perfume.active &&
              perfume.id &&
              (perfume.name_en || perfume.name_ar) &&
              Number.isFinite(perfume.price) &&
              perfume.price >= 0
          );

        setPerfumes(loadedPerfumes);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Catalog loading error:", error);
        setLoadError(true);
        setPerfumes([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPerfumes();

    return () => controller.abort();
  }, [retryCount]);

  const localized = (perfume, field) => {
    const selected = perfume[`${field}_${language}`];
    const fallback = perfume[`${field}_en`];

    return selected || fallback || "";
  };

  const visiblePerfumes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return perfumes.filter((perfume) => {
      const matchesCategory =
        category === "all" || perfume.category === category;

      const searchable = [
        perfume.name_en,
        perfume.name_ar,
        perfume.brand_en,
        perfume.brand_ar,
        perfume.family_en,
        perfume.family_ar,
        ...perfume.notes_en,
        ...perfume.notes_ar,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchable.includes(query);
    });
  }, [perfumes, category, search]);

  const scrollToCollection = () => {
    document.getElementById("collection")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const categoryLabel = (value) => {
    const labels = {
      men: t.men,
      women: t.women,
      unisex: t.unisex,
    };

    return labels[value] || value;
  };

  const orderMessage = () => INSTAGRAM_URL;

  return (
    <div
      className={`site ${isArabic ? "rtl" : "ltr"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header className="navbar">
        <a className="brand" href="#home" aria-label="ZIFF Perfumes home">
          <span className="brand-name">ZIFF</span>
          <span className="brand-subtitle">P E R F U M E S</span>
        </a>

        <nav className="desktop-nav" aria-label={t.menu}>
          <a href="#home">{isArabic ? "الرئيسية" : "Home"}</a>
          <a href="#collection">{isArabic ? "العطور" : "Collection"}</a>
          <a href="#about">{isArabic ? "عنّا" : "About"}</a>
        </nav>

        <div className="nav-actions">
          <button
            className="language-switch"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            aria-label="Change language"
          >
            {isArabic ? "EN" : "عربي"}
          </button>

          <a
            className="instagram-icon"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            IG
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p className="hero-description">{t.subtitle}</p>

            <button className="primary-button" onClick={scrollToCollection}>
              {t.explore}
              <span aria-hidden="true">{isArabic ? "←" : "→"}</span>
            </button>

            <div className="hero-signature">
              <span className="signature-line" />
              <span>{t.from}</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img src={FALLBACK_IMAGE} alt="Elegant fragrance bottle" />
            </div>

            <div className="hero-image-caption">
              <span>ZIFF PERFUMES</span>
              <span>
                {isArabic ? "فن اختيار العطر" : "THE ART OF FRAGRANCE"}
              </span>
            </div>

            <span className="hero-decor hero-decor-one" />
            <span className="hero-decor hero-decor-two" />
          </div>

          <div className="hero-index">01 / 03</div>
        </section>

        <section className="intro-strip" id="about">
          <span className="intro-label">{t.about}</span>

          <div>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText}</p>
          </div>

          <span className="intro-symbol" aria-hidden="true">
            ✳
          </span>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.collection}</span>
              <h2>{t.collectionTitle}</h2>
              <p>{t.collectionSubtitle}</p>
            </div>

            <span className="collection-count">
              {String(visiblePerfumes.length).padStart(2, "0")} {t.products}
            </span>
          </div>

          <div className="catalog-controls">
            <div className="category-tabs" role="group" aria-label={t.collection}>
              {categories.map((item) => (
                <button
                  key={item}
                  className={`category-tab ${
                    category === item ? "active" : ""
                  }`}
                  onClick={() => setCategory(item)}
                >
                  {t[item]}
                </button>
              ))}
            </div>

            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder={t.search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label={t.search}
              />
            </label>
          </div>

          {loading ? (
            <div className="empty-state" role="status">
              <p>{t.loading}</p>
            </div>
          ) : loadError ? (
            <div className="empty-state" role="alert">
              <span aria-hidden="true">✳</span>
              <h3>{t.loadError}</h3>
              <p>{t.loadErrorSub}</p>
              <button
                className="text-button"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                {t.retry}
              </button>
            </div>
          ) : visiblePerfumes.length > 0 ? (
            <div className="perfume-grid">
              {visiblePerfumes.map((perfume, index) => {
                const name = localized(perfume, "name");
                const brand = localized(perfume, "brand");
                const family = localized(perfume, "family");
                const description =
                  localized(perfume, "description") || t.noteFallback;
                const badge = localized(perfume, "badge");
                const notes = localized(perfume, "notes");
                const image = perfume.image_url || FALLBACK_IMAGE;

                return (
                  <article className="perfume-card" key={perfume.id}>
                    <div className="perfume-image-wrap">
                      <img
                        src={image}
                        alt={`${name} fragrance`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />

                      {badge && (
                        <span className="product-badge">{badge}</span>
                      )}

                      <span className="product-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="perfume-info">
                      <div className="product-meta">
                        <span>{categoryLabel(perfume.category)}</span>
                        <span>{family}</span>
                      </div>

                      <p className="perfume-brand">{brand}</p>
                      <h3>{name}</h3>
                      <p className="perfume-description">{description}</p>

                      <div className="notes-block">
                        <span className="notes-label">{t.notes}</span>

                        <div className="notes-list">
                          {notes.map((note) => (
                            <span className="note-chip" key={note}>
                              {note}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="product-bottom">
                        <div className="price-wrap">
                          <strong>
                            {perfume.price.toLocaleString(
                              isArabic ? "ar-EG" : "en-US"
                            )}
                          </strong>
                          <span>{t.currency}</span>
                          <small>{perfume.size}</small>
                        </div>

                        <a
                          className="order-button"
                          href={orderMessage()}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.discover}
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✳</span>
              <h3>{t.empty}</h3>
              <p>{t.emptySub}</p>

              <button
                className="text-button"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                }}
              >
                {t.all}
              </button>
            </div>
          )}
        </section>

        <section className="closing-banner">
          <span className="eyebrow">ZIFF PERFUMES</span>
          <h2>{t.footerText}</h2>
          <p>{t.footerSub}</p>

          <a
            className="primary-button"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t.contact}
            <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

      <footer className="footer">
        <a className="footer-brand" href="#home">
          ZIFF.
        </a>
        <span>© {new Date().getFullYear()} ZIFF Perfumes</span>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
          Instagram ↗
        </a>
      </footer>
    </div>
  );
}

export default App;