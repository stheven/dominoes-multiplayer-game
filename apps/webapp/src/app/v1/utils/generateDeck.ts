export const generateDeck = () => {
  const tiles = []
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ id: `t-${i}-${j}-${Math.random()}`, sides: [i, j] })
    }
  }
  return tiles.sort(() => Math.random() - 0.5)
}
