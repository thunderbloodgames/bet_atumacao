import sys
import os

# --- INÍCIO DA CORREÇÃO ---
current_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(project_root)
# --- FIM DA CORREÇÃO ---

from bot_logic import check_odds_variation

def handler(request, response):
    # seu código aqui...
