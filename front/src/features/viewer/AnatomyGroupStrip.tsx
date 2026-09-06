export function AnatomyGroupStrip() {
  return <nav className="anatomy-groups" aria-label="解剖分组">{['其他', '右上', '右中', '右下', '左上', '左下'].map((name, index) => <button key={name}><span>{name}</span>{index > 0 && <i>{index < 3 ? '◉' : '◉̸'}</i>}</button>)}</nav>
}
