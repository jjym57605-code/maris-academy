
"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function MapsPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function initializeMap() {
      try {
        const [
          leafletModule,
          topojsonModule,
          worldModule,
          countriesModule,
          arabicModule,
        ] = await Promise.all([
          import("leaflet"),
          import("topojson-client"),
          import("world-atlas/countries-10m.json"),
          import("i18n-iso-countries"),
          import("i18n-iso-countries/langs/ar.json"),
        ]);

        if (cancelled || !mapContainer.current) return;

        const L = leafletModule.default;
        const countriesLib = countriesModule.default;
        countriesLib.registerLocale(arabicModule.default);

        const importedWorld = worldModule as unknown as {
          default?: {
            objects: Record<string, unknown>;
          };
          objects: Record<string, unknown>;
        };

        const topology = importedWorld.default ?? importedWorld;
        const countriesObject = topology.objects.countries;

        if (!countriesObject) {
          throw new Error("Country data is missing");
        }

        const countries = topojsonModule.feature(
          topology as never,
          countriesObject as never
        ) as unknown as GeoJSON.FeatureCollection<
          GeoJSON.Geometry,
          { name?: string }
        >;

        if (!countries.features.length) {
          throw new Error("No countries found");
        }

        const worldBounds = L.latLngBounds(
          L.latLng(-85, -180),
          L.latLng(85, 180)
        );

        const leafletMap = L.map(mapContainer.current, {
          center: [20, 0],
          zoom: 1,
          minZoom: 0,
          maxZoom: 7,
          zoomControl: false,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          worldCopyJump: false,
          maxBounds: worldBounds,
          maxBoundsViscosity: 0.65,
          attributionControl: true,
        });

        map = leafletMap;

        L.control
          .zoom({ position: "topleft" })
          .addTo(leafletMap);

        const normalStyle: import("leaflet").PathOptions = {
          color: "#0e7490",
          weight: 1,
          opacity: 0.9,
          fillColor: "#a5f3fc",
          fillOpacity: 0.85,
          lineCap: "round",
          lineJoin: "round",
        };

        const selectedStyle: import("leaflet").PathOptions = {
          color: "#f59e0b",
          weight: 2.5,
          opacity: 1,
          fillColor: "#fbbf24",
          fillOpacity: 0.95,
        };

        let countryLayer: import("leaflet").GeoJSON | null = null;
        let selectedLayer: import("leaflet").Layer | null = null;

        countryLayer = L.geoJSON(countries, {
          style: () => ({ ...normalStyle }),

          onEachFeature: (feature, layer) => {
            layer.on("click", () => {
              if (cancelled || !countryLayer) return;

              if (selectedLayer && selectedLayer !== layer) {
                countryLayer.resetStyle(selectedLayer);
              }

              selectedLayer = layer;

              if ("setStyle" in layer) {
                (layer as import("leaflet").Path).setStyle(
                  selectedStyle
                );
              }

              const numericId = String(feature.id ?? "").padStart(
                3,
                "0"
              );

              const alpha2 =
                countriesLib.numericToAlpha2(numericId);

              const arabicName = alpha2
                ? countriesLib.getName(alpha2, "ar")
                : undefined;

              const countryName =
                arabicName ||
                feature.properties?.name ||
                "اسم الدولة غير متوفر";

              const popupContent = document.createElement("div");
              popupContent.dir = "rtl";
              popupContent.style.textAlign = "right";
              popupContent.style.fontFamily = "Arial, sans-serif";
              popupContent.style.minWidth = "120px";

              const title = document.createElement("strong");
              title.textContent = countryName;
              title.style.fontSize = "16px";
              title.style.color = "#0e7490";

              const subtitle = document.createElement("p");
              subtitle.textContent = "MARIS ACADEMY · خرائطي";
              subtitle.style.margin = "6px 0 0";
              subtitle.style.fontSize = "11px";
              subtitle.style.color = "#64748b";

              popupContent.append(title, subtitle);

              layer.bindPopup(popupContent, {
                closeButton: true,
                autoPan: true,
                maxWidth: 220,
              }).openPopup();
            });

            layer.on("mouseover", () => {
              if (cancelled || selectedLayer === layer) return;

              if ("setStyle" in layer) {
                (layer as import("leaflet").Path).setStyle({
                  color: "#0891b2",
                  weight: 2,
                  fillColor: "#67e8f9",
                  fillOpacity: 1,
                });
              }
            });

            layer.on("mouseout", () => {
              if (cancelled || selectedLayer === layer) return;

              if (countryLayer) {
                countryLayer.resetStyle(layer);
              }
            });
          },
        }).addTo(leafletMap);

        // خلفية بحرية من MARIS، بلا أسماء أو طرق أو تسميات.
        leafletMap.getContainer().style.background = "#dff7fb";

        // إظهار العالم كاملًا عند أول تحميل.
        leafletMap.fitBounds(worldBounds, {
          padding: [8, 8],
          animate: false,
        });

        resizeObserver = new ResizeObserver(() => {
          if (cancelled) return;

          // نحدّث المقاس فقط، دون إلغاء تكبير الطالب أو تحريكه.
          leafletMap.invalidateSize({ animate: false });
        });

        resizeObserver.observe(mapContainer.current);

        requestAnimationFrame(() => {
          if (cancelled) return;

          leafletMap.invalidateSize({ animate: false });
          leafletMap.fitBounds(worldBounds, {
            padding: [8, 8],
            animate: false,
          });

          setLoading(false);
        });
      } catch (err) {
        console.error("Maps initialization error:", err);

        if (!cancelled) {
          setError(
            "ما قدرناش نحمّلو الخريطة. تأكد من تثبيت المكتبات واتصال الإنترنت."
          );
          setLoading(false);
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
    };
  }, []);

  return (
    <main dir="rtl" className="w-full space-y-5 text-white">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-white/[0.03] p-4 sm:p-7">
        <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <span className="text-xs font-black tracking-widest text-cyan-300">
            MARIS ACADEMY · INTERACTIVE MAPS
          </span>

          <h1 className="mt-3 text-2xl font-black sm:text-4xl">
            خرائطي التفاعلية 🌍
          </h1>

          <p className="mt-3 text-sm leading-7 text-foam/65">
            خريطة صمّاء للعالم. حاول تتذكّر اسم الدولة، واضغط عليها
            باش تظهرلك الإجابة بالعربية.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-200">
              🗺️ حدود الدول
            </span>
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-200">
              👆 أسماء بالعربية
            </span>
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-200">
              🔍 تكبير وتحريك
            </span>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#071827] shadow-xl shadow-cyan-950/20">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h2 className="font-black">خريطة العالم الصمّاء</h2>
            <p className="mt-1 text-xs text-foam/50">
              اضغط على الدولة لإظهار اسمها
            </p>
          </div>

          <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300">
            MARIS 🌊
          </span>
        </div>

        {loading && (
          <div className="flex h-64 items-center justify-center text-sm text-cyan-200">
            جارٍ تحميل الخريطة...
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-sm text-amber-300">
            {error}
          </div>
        )}

        <div
          ref={mapContainer}
          className="h-[55vh] min-h-[350px] w-full sm:h-[65vh] sm:min-h-[460px]"
          aria-label="خريطة العالم الصماء التفاعلية"
        />

        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs leading-6 text-foam/50">
          استعمل عجلة الفأرة أو أزرار + و− للتكبير، واسحب الخريطة
          للتنقّل. في الهاتف استعمل إصبعين للتكبير.
        </div>
      </section>

      <p className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm leading-7 text-foam/70">
        ملاحظة: الحدود المعروضة هي الحدود الحالية للدول. الخرائط
        التاريخية الخاصة ببرنامج البكالوريا راح تكون قسمًا منفصلًا
        ببيانات تاريخية موثوقة.
      </p>
    </main>
  );
}
