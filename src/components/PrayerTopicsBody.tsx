import { fs } from '@/lib/fontScale'

/** Only explicit, consecutive numbered lines form topics; dates such as 9.18 do not. */
function splitTopics(content: string) {
  const topics: { number: string; title: string; lines: string[] }[] = []
  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^(\d+)\.\s+(.+)$/)
    if (heading) {
      if (Number(heading[1]) !== topics.length + 1) return null
      topics.push({ number: heading[1], title: heading[2], lines: [] })
    } else if (topics.length) {
      topics[topics.length - 1].lines.push(line)
    } else if (line.trim()) {
      return null
    }
  }
  return topics.length ? topics : null
}

export function PrayerTopicsBody({ content }: { content: string }) {
  const topics = splitTopics(content)
  if (!topics) return <p className="prayer-topics-fallback" style={{ fontSize: fs(15) }}>{content}</p>

  return (
    <ol className="prayer-topics" aria-label="기도 제목 목록">
      {topics.map(topic => (
        <li key={topic.number} className="prayer-topic">
          <span className="prayer-topic-number" aria-hidden="true">{topic.number.padStart(2, '0')}</span>
          <div className="prayer-topic-content">
            <h3 className="prayer-topic-title">{topic.title}</h3>
            {topic.lines.some(line => line.trim()) && (
              <div className="prayer-topic-details">{topic.lines.join('\n')}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
