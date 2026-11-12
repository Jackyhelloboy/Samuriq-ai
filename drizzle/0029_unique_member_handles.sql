CREATE UNIQUE INDEX `participant_username_unique` ON `participants` (`username`) WHERE username <> '';--> statement-breakpoint
UPDATE projects SET uploads_required=1 WHERE id='speech-pair';
--> statement-breakpoint
INSERT INTO integrations(id,url,updated) VALUES ('feature:preview_projects','0','2026-11-12T00:00:00Z') ON CONFLICT(id) DO UPDATE SET url='0';
--> statement-breakpoint
UPDATE notices SET body='Review the current project agreement, QC-based payment conditions and daily reporting responsibilities. Add or update beneficiary bank details through Add Payments. Historical agreements and payment records remain retained.' WHERE id='v10-policy-release';

--> statement-breakpoint
UPDATE participants SET username='member_' || rowid WHERE username='';
--> statement-breakpoint
CREATE TRIGGER participant_handle_default AFTER INSERT ON participants WHEN NEW.username='' BEGIN UPDATE participants SET username='member_' || NEW.rowid WHERE id=NEW.id; END;
