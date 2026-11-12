"use client";

import { useEffect, useState, type FocusEvent } from "react";
import Link from "next/link";
import localFont from "next/font/local";
import { useStore } from "../providers";
import BoxArt from "./box-art";
import ProductImage from "./product-image";
import "./FashionHero.css";

const bannerFont = localFont({
  src: [
    { path: "../../public/fonts/cormorant-garamond-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const gentlemenPhoto = "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=85";

export default function FashionHero() {
  const { products, categories } = useStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const clothingCategory = categories.find((category) => /clothing|fashion|wear/i.test(category)) || "Clothing";
  const ladiesCategory = categories.find((category) => /women|ladies|female/i.test(category)) || clothingCategory;
  const gentlemenCategory = categories.find((category) => /\bmen(?:'s)?\b|\bgent(?:lemen)?\b|\bmale\b|\bboys?\b/i.test(category)) || clothingCategory;
  const mysteryCategory = categories.find((category) => /mystery/i.test(category)) || "Mystery Boxes";
  const ladiesProduct = products.find((product) =>
    /women|woman|ladies|lady|female/i.test(`${product.category} ${product.name}`) && product.image && product.image !== "box"
  );
  const gentlemenProduct = products.find((product) =>
    /\bmen(?:'s)?\b|\bgent(?:lemen)?\b|\bmale\b|\bboys?\b/i.test(`${product.category} ${product.name}`) && product.image && product.image !== "box"
  );

  const slides = [
    {
      eyebrow: "THE LADIES' EDIT",
      title: "A little elegance,",
      emphasis: "made for every day.",
      description: "Discover softly tailored favourites, thoughtful details, and pieces that feel like you.",
      image: ladiesProduct?.image || "/images/fashion-hero.jpeg",
      alt: ladiesProduct ? `${ladiesProduct.name}, ladies' fashion` : "Woman in a flowing pale blue outfit beneath sunlit stone arches",
      caption: "THE EVERYDAY ICONS",
      note: "The ladies' edit",
      category: ladiesCategory,
      cta: "Explore the ladies' edit",
      tone: "rose",
    },
    {
      eyebrow: "THE GENTLEMEN'S EDIT",
      title: "Good style,",
      emphasis: "without trying too hard.",
      description: "A considered edit of easy layers, timeless essentials, and details worth keeping.",
      image: gentlemenProduct?.image || gentlemenPhoto,
      alt: gentlemenProduct ? `${gentlemenProduct.name}, men's fashion` : "Gentleman in a tailored neutral jacket",
      caption: "THE CONSIDERED EDIT",
      note: "Everyday, elevated",
      category: gentlemenCategory,
      cta: "Explore the gentlemen's edit",
      tone: "sand",
    },
    {
      eyebrow: "THE MYSTERY BOX EDIT",
      title: "A little something,",
      emphasis: "just for you.",
      description: "Choose the mood. We'll curate a fashion surprise, beautifully packed and made to brighten your day.",
      alt: "AURZÉN mystery gift box",
      caption: "A SURPRISE WITH YOUR NAME ON IT",
      note: "A little unexpected",
      category: mysteryCategory,
      cta: "Find your mystery box",
      tone: "plum",
      box: true,
    },
  ];

  useEffect(() => {
    if (paused || interacting || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveIndex((index) => (index + 1) % slides.length);
      }
    }, 7000);
    return () => window.clearInterval(timer);
  }, [interacting, paused, slides.length]);

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
  }

  function goTo(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  return (
    <section
      className="lux-hero"
      aria-label="Featured collections"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) setInteracting(false);
      }}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={handleBlur}
    >
      <div className="lux-hero__stage">
        <div className="lux-hero__viewport">
          <div className="lux-hero__track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {slides.map((slide, index) => {
              const active = activeIndex === index;
              return (
                <article
                  key={slide.eyebrow}
                  className="lux-hero__slide"
                  data-tone={slide.tone}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}: ${slide.eyebrow}`}
                  aria-hidden={!active}
                  inert={!active}
                >
                  <div className="lux-hero__copy">
                    <span className="lux-hero__eyebrow">{slide.eyebrow} · AURZÉN</span>
                    <h1 className={bannerFont.className}>
                      {slide.title}
                      <em>{slide.emphasis}</em>
                    </h1>
                    <p>{slide.description}</p>
                    <Link className="lux-hero__button" href={`/shop/?category=${encodeURIComponent(slide.category)}`}>
                      {slide.cta} <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                  <div className="lux-hero__art">
                    <div className="lux-hero__backdrop" />
                    <div className="lux-hero__image-card">
                      {slide.box ? (
                        <div className="lux-hero__box-art" aria-hidden="true"><BoxArt /></div>
                      ) : (
                        <ProductImage
                          className="lux-hero__photo"
                          src={slide.image}
                          category={slide.category}
                          alt={slide.alt}
                          eager={index === 0}
                        />
                      )}
                      <div className="lux-hero__image-glow" />
                      <div className="lux-hero__image-caption">
                        <span>{slide.caption}</span>
                        <strong>{slide.note}</strong>
                      </div>
                    </div>
                    <div className="lux-hero__orbit" aria-hidden="true">CURATED WITH CARE · EST. 2024 ·</div>
                    <div className="lux-hero__floating-note" aria-hidden="true">
                      <span className="lux-hero__note-dot" />
                      <span>{slide.note}</span>
                      <strong>{String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</strong>
                    </div>
                    <div className="lux-hero__side-label" aria-hidden="true">AURZÉN · A LITTLE UNEXPECTED</div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <div className="lux-hero__controls">
        <div className="lux-hero__index">
          <span>{String(activeIndex + 1).padStart(2, "0")}</span>
          <i />
          <span>{String(slides.length).padStart(2, "0")}</span>
          <span className="lux-hero__visually-hidden" aria-live="polite" aria-atomic="true">
            Slide {activeIndex + 1} of {slides.length}: {slides[activeIndex].eyebrow}
          </span>
        </div>
        <div className="lux-hero__control-group" role="group" aria-label="Carousel controls">
          <button type="button" aria-label="Previous slide" onClick={() => goTo(activeIndex - 1)}>←</button>
          {slides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              className="lux-hero__dot"
              aria-label={`Show slide ${index + 1}: ${slide.eyebrow}`}
              aria-current={activeIndex === index}
              onClick={() => goTo(index)}
            />
          ))}
          <button type="button" aria-label="Next slide" onClick={() => goTo(activeIndex + 1)}>→</button>
          <button
            type="button"
            className="lux-hero__play"
            aria-label={paused ? "Play carousel" : "Pause carousel"}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>
    </section>
  );
}
