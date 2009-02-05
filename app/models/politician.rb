class Politician < ActiveRecord::Base
  
  validates_presence_of :first_name, :last_name
  
  # Return cached data or find it out.
  def information
    gather_information if stale?
    self.json
  end
  
  
  # Go out and re-spider this politician.
  def gather_information
    info = Sleuth.new.dig_up_dirt(first_name, last_name)
    self.first_name = info['firstname']
    self.last_name  = info['lastname']
    self.json       = info.to_json
    save
  end
  
  
  # Is our cache empty or past its expiration date?
  def stale?
    updated_at < 1.week.ago || json == '{}'
  end
  
end
