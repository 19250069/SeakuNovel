<?php

namespace App\Console\Commands;

use App\Models\Chapter;
use App\Models\Novel;
use App\Models\ScheduledPublication;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class ProcessScheduledPublications extends Command
{
    protected $signature = 'publications:process';
    protected $description = 'Check and publish scheduled chapters and novels whose publish_at <= NOW()';

    public function handle(): int
    {
        $scheduled = ScheduledPublication::where('status', 'scheduled')
            ->where('publish_at', '<=', now())
            ->get();

        if ($scheduled->isEmpty()) {
            return self::SUCCESS;
        }

        foreach ($scheduled as $item) {
            if ($item->chapter_id) {
                $chapter = Chapter::find($item->chapter_id);
                $novel = Novel::find($item->novel_id);

                if ($chapter) {
                    $chapter->is_published = true;
                    $chapter->save();

                    if ($novel) {
                        NotificationService::notifyFollowersOfNewChapter($chapter, $novel);
                    }
                    $this->info("Published scheduled chapter {$chapter->id} for novel {$item->novel_id}");
                }
            } elseif ($item->novel_id) {
                $novel = Novel::find($item->novel_id);
                if ($novel) {
                    $novel->status = 'published';
                    $novel->save();
                    $this->info("Published scheduled novel {$novel->id}");
                }
            }

            $item->status = 'published';
            $item->save();
        }

        $this->info("Processed {$scheduled->count()} scheduled publications.");
        return self::SUCCESS;
    }
}
