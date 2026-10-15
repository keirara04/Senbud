<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'feature'])]
class WaitlistSignup extends Model
{
    public const UPDATED_AT = null;
}
