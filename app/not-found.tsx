import Link from 'next/link';
export default function NotFound() {
  return <main style={{ padding: '4rem 2rem', maxWidth: 700, margin: 'auto' }}>
    <p>404</p>
    <h1>Страница не найдена</h1>
    <p>Возможно, ссылка устарела. Продолжите работу в конструкторе миссий.</p>
    <Link href="/builder/">Открыть конструктор</Link>
  </main>;
}
