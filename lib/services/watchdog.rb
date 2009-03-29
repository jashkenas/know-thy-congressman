module Services

  module Watchdog
    extend Base

    URL = 'watchdog.net'

    # Dig up dirt from the ever-wonderful and quite helpful Watchdog.
    def self.search(bioguide_id)
      safe_request('watchdog', :ensure => bioguide_id) do
        dog = Net::HTTP.new(URL, 80)
        # In order to determine the real URL to request, which isn't always
        # a straight transformation of the name, we issue a search request
        # for the bioguide ID, and use the URL that we get redirected to instead.
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