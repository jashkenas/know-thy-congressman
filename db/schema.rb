# This file is auto-generated from the current state of the database. Instead of editing this file, 
# please use the migrations feature of Active Record to incrementally modify your database, and
# then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your database schema. If you need
# to create the application database on another system, you should be using db:schema:load, not running
# all the migrations from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20090121025708) do

  create_table "politicians", :force => true do |t|
    t.string   "bioguide_id",                   :null => false
    t.string   "first_name",                    :null => false
    t.string   "last_name",                     :null => false
    t.text     "json",        :default => "{}", :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "politicians", ["bioguide_id"], :name => "index_politicians_on_bioguide_id"
  add_index "politicians", ["first_name", "last_name"], :name => "index_politicians_on_first_name_and_last_name"

end
