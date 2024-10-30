#!/usr/bin/python
import os
import sys
from lxml import html
import pandas
from glob import glob

if len(sys.argv) < 2:
    print('Usage: %s [generate|check]' % sys.argv[0])
    exit(1)

def sort_function(file_and_coverage):
    return str.lower(file_and_coverage[0])

def to_missing(x):
    "Converts from the string AA/BB to the number BB-AA"
    [low, high] = x.split('/')
    return int(high)-int(low)

def load_coverage_data():
    files = glob("coverage/src/app/**/*.ts.html", recursive=True)
    if files == []:
        print('ERROR: No file found! Check the path to the coverage files.')
        exit(1)
    data = {
        'statements': {},
        'branches': {},
        'functions': {},
        'lines': {},
    }
    for path in files:
        f = open(path, mode='r', encoding='utf8')
        page = f.read()
        f.close()
        tree = html.fromstring(page)
        filename = os.path.split(path)[1][:-5]
        xpath_results = tree.xpath("//span[contains(@class, 'fraction')]/text()")
        data['statements'][filename] = to_missing(xpath_results[0])
        data['branches'][filename] = to_missing(xpath_results[1])
        data['functions'][filename] = to_missing(xpath_results[2])
        data['lines'][filename] = to_missing(xpath_results[3])
    return data

def load_stored_coverage_from(path):
    data = pandas.read_csv(path, header=None, encoding='utf8')
    files = data[0]
    values = data[1]
    return dict(sorted(zip(files, values), key=sort_function))

def load_stored_coverage():
    return {
        'statements': load_stored_coverage_from('coverage/statements.csv'),
        'branches': load_stored_coverage_from('coverage/branches.csv'),
        'functions': load_stored_coverage_from('coverage/functions.csv'),
        'lines': load_stored_coverage_from('coverage/lines.csv')
    }

def generate_in_file(data, path):
    f = open(path, mode='w', encoding='utf8', newline='\n')
    for directory in dict(sorted(data.items(), key=sort_function)):
        if data[directory] > 0:
            # Only store if coverage is > 0
            f.write('%s,%d\n' % (directory, data[directory]))
    f.close()

def generate():
    data = load_coverage_data()
    generate_in_file(data['statements'], 'coverage/statements.csv')
    generate_in_file(data['branches'], 'coverage/branches.csv')
    generate_in_file(data['functions'], 'coverage/functions.csv')
    generate_in_file(data['lines'], 'coverage/lines.csv')
    print('CSV files generated with success')

def check():
    old = load_stored_coverage()
    new = load_coverage_data()

    decreased = False
    for type_ in ['statements', 'branches', 'functions', 'lines']:
        for directory in set.union(set(old[type_]), set(new[type_])):
            if directory in old[type_] and directory in new[type_]:
                new_missing = new[type_][directory]
                old_missing = old[type_][directory]
                if new_missing > old_missing:
                    decreased = True
                    print('ERROR: increased missing %s in coverage of %s, from %d to %d' % (type_, directory, old_missing, new_missing))
                elif new_missing < old_missing:
                    print('GOOD: decreased missing %s in coverage of %s, from %d to %d' % (type_, directory, old_missing, new_missing))
            elif not (directory in new[type_]):
                # directory was removed, everything is fine
                continue
            elif not (directory in old[type_]):
                # new directory, we require 100% coverage
                new_missing = new[type_][directory]
                if new_missing > 0:
                    decreased = True
                    print('ERROR: increased missing %s in coverage of %s: uncovered %d %s' % (type_, directory, new_missing, type_))

    if decreased:
        exit(1) # fail for CI script

if sys.argv[1] == 'check':
    check()
elif sys.argv[1] == 'generate':
    generate()
else:
    print('Usage: %s [generate|check]' % sys.argv[0])
    exit(1)
