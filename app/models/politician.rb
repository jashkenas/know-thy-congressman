class Politician < ActiveRecord::Base
  
  validates_presence_of :first_name, :last_name
  
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
    self.json = Services.dig_up_dirt(first_name, last_name).to_json
    save
  end
  
  
  # Is our cache empty or past its expiration date?
  def stale?
    updated_at < 2.weeks.ago || json == '{}'
  end
  
end
