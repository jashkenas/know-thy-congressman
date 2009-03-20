module Services

  module Watchdog
    extend Base

    URL = 'watchdog.net'

    def self.search(bioguide_id)
      safe_request('watchdog', :ensure => bioguide_id) do
        dog = Net::HTTP.new(URL, 80)
        loc = dog.get("/p/search.json?bioguideid=#{bioguide_id}").header['location']
        return {} if loc.blank?
        data = get_json("#{loc}.json").first
        data.delete 'bills_sponsored'     # Just a buncha URLS, not too useful.
        data.delete 'earmarks_sponsored'  # Always seems to return a list of nils.
        data
      end
    end

  end

end