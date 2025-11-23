import { Github, Mail, ExternalLink, Code2, Database, FileText } from 'lucide-react';

export default function Home() {
  const projects = [
    {
      title: "Automated Report Generator",
      description: "Production-ready Python automation tool that transforms 2-3 hour manual reporting tasks into 5-minute one-click operations.",
      longDescription: "Automatically aggregates data from multiple CSV sources, validates data integrity, generates professional PDF reports with charts (matplotlib), and emails them to stakeholders. Reduced weekly reporting time by 97%.",
      technologies: ["Python", "Pandas", "Matplotlib", "ReportLab", "SMTP"],
      metrics: [
        "97% time savings (2.5 hours → 5 minutes)",
        "Zero manual data entry errors",
        "29 automated tests with 73% coverage"
      ],
      github: "https://github.com/ChrisTorresDev/automated-report-generator",
      icon: FileText,
    },
    {
      title: "Data Cleaning & Validation Tool",
      description: "Intelligent CLI tool that reduces data preparation from 3 hours to 10 minutes with automatic validation and standardization.",
      longDescription: "Validates email addresses with RFC-compliant regex, normalizes phone numbers to E.164 format, standardizes dates from multiple formats, and removes duplicates. Includes automatic backups and detailed validation reports.",
      technologies: ["Python", "CLI", "Data Validation", "JSON Logging"],
      metrics: [
        "94% time savings (3 hours → 10 minutes)",
        "Zero validation errors",
        "52 comprehensive automated tests"
      ],
      github: "https://github.com/ChrisTorresDev/data-cleaning-validation-tool",
      icon: Database,
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chris Torres
          </h1>
          <div className="flex gap-6">
            <a href="#projects" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              Projects
            </a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              About
            </a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              <Code2 className="w-4 h-4" />
              Python Automation Specialist
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white max-w-4xl">
              I Help Teams Save{' '}
              <span className="text-blue-600 dark:text-blue-400">10+ Hours Per Week</span>
              {' '}Through Python Automation
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
              Specializing in CSV/Excel processing, automated reporting, and data validation.
              I build production-ready tools that eliminate repetitive manual work.
            </p>
            <div className="flex gap-4 pt-4">
              <a
                href="#contact"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Get In Touch
              </a>
              <a
                href="#projects"
                className="px-8 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
              >
                View Projects
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">95%+</div>
              <div className="text-gray-600 dark:text-gray-300 mt-2">Average Time Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">Zero</div>
              <div className="text-gray-600 dark:text-gray-300 mt-2">Manual Data Entry Errors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">$6,500+</div>
              <div className="text-gray-600 dark:text-gray-300 mt-2">Annual ROI Per Tool</div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Featured Projects
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real automation tools that save teams hours every week
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project, index) => {
              const Icon = project.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {project.title}
                    </h3>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {project.description}
                  </p>

                  <p className="text-gray-700 dark:text-gray-400 mb-6 text-sm">
                    {project.longDescription}
                  </p>

                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Key Results:</h4>
                    <ul className="space-y-2">
                      {project.metrics.map((metric, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    <Github className="w-5 h-5" />
                    View on GitHub
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-white dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            About Me
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              I&apos;m a Python automation specialist focused on eliminating repetitive manual work.
              If your team is spending hours on CSV processing, report generation, or data validation,
              I build tools that reduce that work from hours to minutes.
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              My approach is simple: understand the manual process, build a production-ready solution
              with comprehensive error handling, and deliver complete documentation so your team can
              actually use the tool. No complex infrastructure, no ongoing costs—just clean Python
              scripts that solve your specific problem.
            </p>

            <div className="mt-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">What I&apos;m Best At</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "CSV/Excel data processing",
                  "Automated PDF report generation",
                  "Data cleaning and validation",
                  "Email automation",
                  "Converting spreadsheet workflows to scripts",
                  "Production-ready Python tools"
                ].map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Let&apos;s Work Together
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Have a repetitive task eating up your team&apos;s time? Let&apos;s talk about automating it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@christorresdev.com"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2 text-lg"
            >
              <Mail className="w-5 h-5" />
              contact@christorresdev.com
            </a>
            <a
              href="https://github.com/ChrisTorresDev"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors inline-flex items-center justify-center gap-2 text-lg"
            >
              <Github className="w-5 h-5" />
              GitHub Profile
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              Available for freelance projects • Typical response time: 2 hours during business hours (EST)
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Chris Torres. All rights reserved.</p>
          <p className="mt-2 text-sm">Built with Next.js • Hosted on self-hosted infrastructure</p>
        </div>
      </footer>
    </div>
  );
}
