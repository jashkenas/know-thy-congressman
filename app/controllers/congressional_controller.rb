class CongressionalController < ApplicationController
  layout nil
  
  # Search the APIs for congressional data, or return it from the cache.
  def find
    first_name, last_name = params[:name].split('_')
    first_name.downcase! and last_name.downcase!
    pol = Politician.find_or_create_by_first_name_and_last_name(first_name, last_name)
    respond_to do |format|
      format.json { render :json => pol.information }
      format.js   { render_jsonp(pol.information) }
      format.text { render :text => JSON.parse(pol.information).to_yaml }
    end
  end
  
  
  # Grab all of the available javascript templates.
  def templates
    files = Dir["#{RAILS_ROOT}/app/views/js_templates/*.*"]
    @templates = files.map do |f| 
      {:name    => File.basename(f, '.html.erb'), :content => File.read(f) }
    end
    render :template => 'congressional/templates', :content_type => :js
  end
  
  
  # Dynamically render the bookmarklet javascript, for flexibility.
  def bookmarklet
    # Just render.
  end
  
end