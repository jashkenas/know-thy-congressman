desc "Deploy via git"
task :deploy do
  todo = []
  todo << 'cd sites/know-thy-congressman'
  todo << 'git fetch origin'
  todo << 'git merge origin/master'
  todo << 'touch tmp/restart.txt'
  system "ssh -p 9977 -t jashkenas@know-thy-congressman.com '#{todo.join(" && ")}'"
end