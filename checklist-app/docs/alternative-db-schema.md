PostgreSQL DDL (recommended alternative to Prisma-managed SQLite)

-- Users and Groups
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  custom_permissions JSONB,
  group_id UUID REFERENCES groups(id),
  is_active BOOLEAN DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  created_by UUID REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Templates and nodes (adjacency list)
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  default_routing_group_id UUID REFERENCES groups(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE checklist_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES checklist_templates(id) NOT NULL,
  parent_node_id UUID REFERENCES checklist_nodes(id),
  order_index integer DEFAULT 0,
  title TEXT NOT NULL,
  node_type TEXT NOT NULL,
  input_type TEXT,
  options JSONB,
  is_required boolean DEFAULT false,
  help_text TEXT,
  depth_level integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Instances and responses
CREATE TABLE checklist_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES checklist_templates(id) NOT NULL,
  status TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES users(id),
  routed_to_group_id UUID REFERENCES groups(id),
  created_by UUID REFERENCES users(id) NOT NULL,
  started_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by UUID REFERENCES users(id),
  review_comments TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES checklist_instances(id) NOT NULL,
  node_id UUID REFERENCES checklist_nodes(id) NOT NULL,
  value JSONB,
  file_url TEXT,
  filled_by_user_id UUID REFERENCES users(id),
  filled_at timestamptz DEFAULT now(),
  is_complete boolean DEFAULT false
);

-- Audit log and notifications
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


Mongoose (MongoDB) schema sketches

const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  fullName: String,
  passwordHash: String,
  role: String,
  customPermissions: { type: Object },
  groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const GroupSchema = new Schema({
  name: String,
  description: String,
  type: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ChecklistNodeSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate' },
  parentNodeId: { type: Schema.Types.ObjectId, ref: 'ChecklistNode' },
  orderIndex: Number,
  title: String,
  nodeType: String,
  inputType: String,
  options: Object,
  isRequired: Boolean,
  helpText: String,
  depthLevel: Number
}, { timestamps: true });

const ChecklistTemplateSchema = new Schema({
  name: String,
  description: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  version: Number,
  isActive: Boolean,
  defaultRoutingGroupId: { type: Schema.Types.ObjectId, ref: 'Group' }
}, { timestamps: true });

const ChecklistInstanceSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate' },
  status: String,
  assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  routedToGroupId: { type: Schema.Types.ObjectId, ref: 'Group' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ChecklistResponseSchema = new Schema({
  instanceId: { type: Schema.Types.ObjectId, ref: 'ChecklistInstance' },
  nodeId: { type: Schema.Types.ObjectId, ref: 'ChecklistNode' },
  value: Schema.Types.Mixed,
  fileUrl: String,
  filledByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Group: mongoose.model('Group', GroupSchema),
  ChecklistTemplate: mongoose.model('ChecklistTemplate', ChecklistTemplateSchema),
  ChecklistNode: mongoose.model('ChecklistNode', ChecklistNodeSchema),
  ChecklistInstance: mongoose.model('ChecklistInstance', ChecklistInstanceSchema),
  ChecklistResponse: mongoose.model('ChecklistResponse', ChecklistResponseSchema)
};
