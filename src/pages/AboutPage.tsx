import { Github, Linkedin, ExternalLink, Code2, Braces, Cpu, AudioLines } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Vite',
  'Tailwind CSS', 'Speech-to-Text', 'AI/ML', 'REST APIs', 'Git',
];

const HIGHLIGHTS = [
  {
    icon: AudioLines,
    title: 'STT Battle Lab',
    description: 'Built a real-time speech-to-text benchmarking tool to compare transcription services side-by-side.',
  },
  {
    icon: Braces,
    title: 'Clean Architecture',
    description: 'Focused on readable, maintainable code with modern React patterns and type safety.',
  },
  {
    icon: Cpu,
    title: 'AI Integration',
    description: 'Leveraging AI models like Gemini for intelligent transcript analysis and quality scoring.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">About the Coder</h1>
        <p className="text-sm text-muted-foreground">The person behind STT Battle Lab</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
          <img
            src="https://media.licdn.com/dms/image/v2/D5603AQEz2KdKC8B02A/profile-displayphoto-scale_400_400/B56ZyLSNKAKMAk-/0/1771863347167?e=1774483200&v=beta&t=6xR1Rr-T99pTGIisegsCH64kIbrzMjxM87zdBjhdTnI"
            alt="Harsimran Preet Singh"
            className="h-28 w-28 flex-shrink-0 rounded-2xl border-2 border-border object-cover shadow-sm"
          />
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div>
              <h2 className="text-lg font-bold text-foreground">Harsimran Preet Singh</h2>
              <p className="text-sm text-muted-foreground">Software Developer</p>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground text-center sm:text-left">
              Passionate about building tools that make complex technology accessible. STT Battle Lab was born
              from the desire to objectively compare speech-to-text services and help developers choose the
              right one for their needs.
            </p>
            <div className="flex gap-2">
              <a href="https://www.linkedin.com/in/harsimran-p-singh/" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Button>
              </a>
              <a href="https://github.com/harsimran-preet" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project highlights */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Project Highlights</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Skills */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Tech Stack</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(skill => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
