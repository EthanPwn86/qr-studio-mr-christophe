CREATE TABLE IF NOT EXISTS statistiques (
  periode TEXT PRIMARY KEY,
  qr_generes INTEGER NOT NULL DEFAULT 0,
  telechargements_png INTEGER NOT NULL DEFAULT 0,
  telechargements_svg INTEGER NOT NULL DEFAULT 0,
  telechargements_total INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO statistiques (periode) VALUES ('TOTAL');

CREATE VIEW IF NOT EXISTS tableau_de_bord AS
SELECT periode AS Periode, qr_generes AS QR,
  telechargements_png AS PNG, telechargements_svg AS SVG,
  telechargements_total AS Exports
FROM statistiques
ORDER BY periode DESC;
