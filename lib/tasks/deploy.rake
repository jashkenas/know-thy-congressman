desc "Deploy via git to ashkenas.com"
task :deploy do
  todo = []
  todo << 'cd sites/know-thy-congressman'
  todo << 'git fetch origin'
  todo << 'git merge origin/master'
  todo << 'touch tmp/restart.txt'
  system "ssh -p 9977 -t jashkenas@know-thy-congressman.com '#{todo.join(" && ")}'"
end


desc "Deploy to Sunlight Labs' Hammond Staging via git"
task :staging_deploy do
  todo = []
  todo << 'cd src/know-thy-congressman'
  todo << 'git fetch origin'
  todo << 'git merge origin/master'
  todo << 'touch tmp/restart.txt'
  system "ssh -t ktc@hammond.sunlightlabs.org '#{todo.join(" && ")}'"
end