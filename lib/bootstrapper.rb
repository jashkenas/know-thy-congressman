# This module should use the Sunlight Labs comprehensive congressional
# dump to load in all the basic information about every congressman that
# Sunlight Labs knows about. It then goes and digs up their dirt from the 
# rest of the services, so that we have a full data set, getting started.

module Bootstrapper
  
  BATCH_SIZE = 1
  
  # Populate the base data for any politicians in the Sunlight Labs
  # database that don't exist in ours.
  def self.populate_database(destructive=false)
    Politician.destroy_all if destructive
    everyone = Services::Sunlight.get_all_politicians
    everyone.each do |info|
      info        = info['legislator']
      first_name  = info['firstname'].downcase
      last_name   = info['lastname'].downcase
      bioguide_id = info['bioguide_id']
      return if Politician.find_by_bioguide_id(bioguide_id)
      Politician.create(:first_name => first_name, :last_name => last_name, 
                        :bioguide_id => bioguide_id, :json => info.to_json)
    end
  end
  
  
  # Go through the database and refresh everyone's info in parallel.
  def self.refresh_database
    politicians = Politician.all
    until politicians.empty? do
      batch       = politicians.slice(0, BATCH_SIZE)
      politicians = politicians.slice(BATCH_SIZE, politicians.length - BATCH_SIZE)
      threads = []
      batch.each {|pol| threads << Thread.new { pol.gather_information } }
      threads.each {|thread| thread.join }
    end
  end
  
end