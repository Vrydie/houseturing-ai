import fs from 'fs';

let content = fs.readFileSync('tienda/theme/layout/theme.liquid', 'utf8');

const injection = `
    <!-- C3 Tokens -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --color-grafito: #121417;
        --color-acero: #1D2126;
        --color-linea: #2E343B;
        --color-gris-claro: #F1F2F3;
        --color-amarillo: #FFC400;
        --color-whatsapp: #25D366;
        --color-whatsapp-text: #0B2B1A;
        
        --font-titulos: 'Barlow Condensed', sans-serif;
        --font-texto: 'Barlow', sans-serif;
      }
      body {
        font-family: var(--font-texto) !important;
        background-color: var(--color-gris-claro) !important;
        color: var(--color-grafito) !important;
      }
      h1, h2, h3, h4, h5, h6, .price, .cifra {
        font-family: var(--font-titulos) !important;
      }
    </style>
    <!-- End C3 Tokens -->
`;

content = content.replace('</head>', injection + '\n  </head>');

fs.writeFileSync('tienda/theme/layout/theme.liquid', content);
