#!/usr/bin/env python3
"""speaker-profiler CLI: python -m speaker_profiler <url> [options]"""
import sys, argparse
from .core import profile, compare

def main():
    parser = argparse.ArgumentParser(description="Speaker Profiler — automated voice identity pipeline")
    parser.add_argument("source", nargs="?", help="Audio URL or file path")
    parser.add_argument("--name", help="Guest name")
    parser.add_argument("--gender", choices=["M", "F", "NB", "?"], default="?")
    parser.add_argument("--desc", help="Brief description")
    parser.add_argument("--compare", action="store_true", help="Compare all profiled guests")
    args = parser.parse_args()
    
    if args.compare:
        compare()
    elif args.source:
        profile(args.source, name=args.name, gender=args.gender, desc=args.desc)
        compare()
    else:
        parser.print_help()
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
