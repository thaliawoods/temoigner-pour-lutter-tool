import localFont from "next/font/local";

export const nimbusRoman = localFont({
  variable: "--font-roman",
  src: [
    { path: "../../public/fonts/NimbusRoman-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/NimbusRoman-Italic.otf", weight: "400", style: "italic" },
    { path: "../../public/fonts/NimbusRoman-BoldItalic.otf", weight: "700", style: "italic" },
  ],
});

export const nimbusSans = localFont({
  variable: "--font-sans",
  src: [
    { path: "../../public/fonts/NimbusSans-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/NimbusSans-Bold.otf", weight: "700", style: "normal" },
  ],
});
