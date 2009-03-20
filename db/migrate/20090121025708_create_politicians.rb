class CreatePoliticians < ActiveRecord::Migration
  def self.up
    create_table :politicians do |t|
      t.string    'bioguide_id',    :null => false
      t.string    'first_name',     :null => false
      t.string    'last_name',      :null => false
      t.text      'json',           :null => false,   :default => '{}'
      t.timestamps
    end
    
    add_index :politicians, 'bioguide_id'
    add_index :politicians, ['first_name', 'last_name']
  end

  def self.down
    drop_table :politicians
  end
end
