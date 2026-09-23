# El video de My Voice

El reel de un minuto, en Remotion. **Horizontal 1920×1080, 30 fps, 1800 frames.**

El guión completo —con el porqué de cada plano— está en
[`docs/guion-reel-1min.md`](../docs/guion-reel-1min.md). Este proyecto es ese guión ejecutable.

```bash
npm install
npm start     # el estudio, para mirar y ajustar
npm run build # renderiza out/myvoice-reel.mp4 (~40 s, 24 MB)
```

## Dónde se toca cada cosa

| Qué querés cambiar | Dónde |
|---|---|
| **El ritmo**, las duraciones, el orden de los planos | `src/guion.ts` — y en ningún otro lado |
| El texto de un plano | `src/guion.ts` |
| Adónde mira la cámara en una captura | `desde` / `hasta` del plano, en coordenadas relativas (0-1) |
| Cómo se ve un tipo de plano | `src/planos/` |
| Las piezas de movimiento | `src/componentes/` |

**Las duraciones viven en `PLANOS` a propósito.** Cuando haya música, ajustar el montaje tiene
que ser mover números en una lista hasta que los cortes caigan en el beat — no editar diecinueve
componentes.

## Las capturas

Están en `public/pantallas/`, exportadas del `.pen` con el MCP de Pencil. Si cambia una pantalla
del producto, se vuelve a exportar y se reemplaza el PNG: los planos las referencian por nombre.

**Ojo con el resalte.** El recuadro que señala una zona (`resalte`) va en coordenadas **del
cuadro**, no de la captura, así que su plano no mueve la cámara: si se moviera, el recuadro
quedaría señalando el lugar equivocado. Es la única parte del proyecto que se ajusta a ojo,
mirando un `remotion still`.

## Lo que falta

- La **música**, con un corte marcado cerca del segundo 8: ahí va el flash a blanco que separa el
  problema del producto.
- El **plano 12** puede reemplazarse por una captura de pantalla real del tablero moviendo una
  tarjeta. Una tarjeta que se mueve de verdad vale más que la misma animada sobre una imagen fija.
