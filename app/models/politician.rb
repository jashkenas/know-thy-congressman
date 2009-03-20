# By royal decree (NYTimes / Sunlight Labs), the bioguide_id is the
# official id for a Politician.

class Politician < ActiveRecord::Base
  
  validates_presence_of :first_name, :last_name, :bioguide_id
  
  STALE_AFTER = 1.week
  
  # Search for a politician by first name and last name, checking the database,
  # TODO: and then trying Sunlight Labs.
  def self.search_for(first_name, last_name)
    Politician.find_by_first_name_and_last_name(first_name, last_name)
  end
  
  
  # Return cached data or find it out.
  def information
    begin
      gather_information if stale?
      self.json
    rescue Services::NotFoundException => e
      self.destroy
      {'error' => e.message}.to_json
    end
  end
  
  
  # Go out and re-spider this politician.
  def gather_information
    self.json = Services.dig_up_dirt(self).to_json
    save
  end
  
  
  # Is our cache empty or past its expiration date?
  def stale?
    updated_at < STALE_AFTER.ago || json == '{}'
  end
  
end
