export function shouldDropBlock(expand: boolean, hovered: boolean, inside: boolean) {
  return !expand && !hovered && !inside
}
